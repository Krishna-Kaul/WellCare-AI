from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, date, timedelta
from pydantic import BaseModel

from app.core.database import get_db
from app.api.deps import require_role
from app.models.user import User, UserRole
from app.models.reminder import ReminderLog, ReminderStatus
from app.models.medication import Medication
from app.schemas.reminder import ReminderLogCreate, ReminderStatusUpdate, ReminderLogResponse
from app.services.behavior_analyzer import compute_features
from app.services.ml_predictor import predict as ml_predict
from app.services.streak_service import recalculate_patient_streak

router = APIRouter()


@router.get("/today")
def get_todays_reminders(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.patient, UserRole.admin))
):
    today = date.today()
    logs = db.query(ReminderLog).join(Medication, ReminderLog.medication_id == Medication.id).filter(
        ReminderLog.user_id        == current_user.id,
        ReminderLog.scheduled_time >= datetime.combine(today, datetime.min.time()),
        ReminderLog.scheduled_time <= datetime.combine(today, datetime.max.time()),
        Medication.is_active       == True
    ).all()

    is_weekend = datetime.now().weekday() >= 5
    ml_cache: dict = {}
    result = []

    for log in logs:
        med = db.query(Medication).filter(Medication.id == log.medication_id).first()

        med_id = log.medication_id
        slot_time = log.scheduled_time.time()
        cache_key = f"{med_id}_{slot_time}"

        if cache_key not in ml_cache:
            try:
                features         = compute_features(current_user.id, med_id, db, slot_time=slot_time)
                ml_result        = ml_predict(features, is_weekend)
                ml_cache[cache_key] = {
                    "risk_level":             ml_result.risk_level,
                    "miss_probability":       ml_result.miss_probability,
                    "early_by_minutes":       ml_result.early_by_minutes,
                    "should_repeat_reminder": ml_result.should_repeat_reminder,
                    "repeat_after_minutes":   ml_result.repeat_after_minutes,
                    "ml_reasoning":           ml_result.reasoning,
                }
            except Exception:
                ml_cache[cache_key] = {
                    "risk_level":             "low",
                    "miss_probability":       0.0,
                    "early_by_minutes":       0,
                    "should_repeat_reminder": False,
                    "repeat_after_minutes":   0,
                    "ml_reasoning":           "",
                }

        ml = ml_cache[cache_key]

        result.append({
            "log_id":         log.id,
            "medication_id":  log.medication_id,
            "medicine_name":  med.name if med else "Unknown",
            "strength":       med.strength if med else None,
            "before_meal":    med.before_meal if med else False,
            "scheduled_time": log.scheduled_time,
            "status":         log.status,
            "action_time":    log.action_time,
            "created_at":     log.created_at,
            "risk_level":             ml["risk_level"],
            "miss_probability":       ml["miss_probability"],
            "early_by_minutes":       ml["early_by_minutes"],
            "should_repeat_reminder": ml["should_repeat_reminder"],
            "repeat_after_minutes":   ml["repeat_after_minutes"],
            "ml_reasoning":           ml["ml_reasoning"],
            "snooze_count":           log.snooze_count,
            "snoozed_until":          log.snoozed_until,
        })

    return result


@router.get("/upcoming")
def get_upcoming_reminders(
    hours: int = 24,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.patient, UserRole.admin))
):
    now   = datetime.now()
    until = now + timedelta(hours=hours)

    logs = db.query(ReminderLog).join(Medication, ReminderLog.medication_id == Medication.id).filter(
        ReminderLog.user_id        == current_user.id,
        ReminderLog.status         == ReminderStatus.pending,
        ReminderLog.scheduled_time >= now,
        ReminderLog.scheduled_time <= until,
        Medication.is_active       == True
    ).order_by(ReminderLog.scheduled_time.asc()).all()

    is_weekend = now.weekday() >= 5
    ml_cache: dict = {}
    result = []

    for log in logs:
        med           = db.query(Medication).filter(Medication.id == log.medication_id).first()
        minutes_until = int((log.scheduled_time - now).total_seconds() / 60)

        med_id = log.medication_id
        slot_time = log.scheduled_time.time()
        cache_key = f"{med_id}_{slot_time}"

        if cache_key not in ml_cache:
            try:
                features         = compute_features(current_user.id, med_id, db, slot_time=slot_time)
                ml_result        = ml_predict(features, is_weekend)
                ml_cache[cache_key] = {
                    "risk_level":       ml_result.risk_level,
                    "miss_probability": ml_result.miss_probability,
                    "early_by_minutes": ml_result.early_by_minutes,
                }
            except Exception:
                ml_cache[cache_key] = {
                    "risk_level":       "low",
                    "miss_probability": 0.0,
                    "early_by_minutes": 0,
                }

        ml = ml_cache[cache_key]

        result.append({
            "log_id":         log.id,
            "medicine_name":  med.name if med else "Unknown",
            "strength":       med.strength if med else None,
            "before_meal":    med.before_meal if med else False,
            "scheduled_time": log.scheduled_time,
            "status":         log.status,
            "minutes_until":  minutes_until,
            "risk_level":              ml["risk_level"],
            "miss_probability":        ml["miss_probability"],
            "early_by_minutes":        ml["early_by_minutes"],
            "effective_minutes_until": minutes_until - ml["early_by_minutes"],
            "snooze_count":            log.snooze_count,
            "snoozed_until":           log.snoozed_until,
        })

    return result


@router.get("/history")
def get_reminder_history(
    days: int = 7,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.patient, UserRole.admin))
):
    from_date = datetime.combine(date.today() - timedelta(days=days), datetime.min.time())

    logs = db.query(ReminderLog).filter(
        ReminderLog.user_id        == current_user.id,
        ReminderLog.scheduled_time >= from_date
    ).order_by(ReminderLog.scheduled_time.desc()).all()

    result = []
    for log in logs:
        med = db.query(Medication).filter(Medication.id == log.medication_id).first()
        result.append({
            "log_id":         log.id,
            "medication_id":  log.medication_id,
            "medicine_name":  med.name if med else "Unknown",
            "strength":       med.strength if med else None,
            "scheduled_time": log.scheduled_time,
            "action_time":    log.action_time,
            "status":         log.status,
        })

    return result


@router.post("/generate-today")
def generate_todays_reminders(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.patient, UserRole.admin))
):
    today = date.today()

    existing = db.query(ReminderLog).filter(
        ReminderLog.user_id        == current_user.id,
        ReminderLog.scheduled_time >= datetime.combine(today, datetime.min.time()),
        ReminderLog.scheduled_time <= datetime.combine(today, datetime.max.time())
    ).all()
    existing_med_ids = {log.medication_id for log in existing}

    medicines = db.query(Medication).filter(
        Medication.user_id   == current_user.id,
        Medication.is_active == True
    ).all()

    created_count       = 0
    medicines_processed = 0

    for med in medicines:
        if med.id in existing_med_ids:
            continue

        medicines_processed += 1

        timing_map = {
            "morning":   8,
            "afternoon": 13,
            "evening":   18,
            "night":     21,
        }

        custom_slots: list[tuple[int, int]] = []
        if med.custom_times:
            for t in med.custom_times.split(","):
                t = t.strip()
                try:
                    h, m = t.split(":")
                    custom_slots.append((int(h), int(m)))
                except Exception:
                    pass

        if custom_slots:
            for hour, minute in custom_slots:
                scheduled = datetime.combine(today, datetime.min.time()).replace(
                    hour=hour, minute=minute
                )
                log = ReminderLog(
                    user_id        = current_user.id,
                    medication_id  = med.id,
                    scheduled_time = scheduled,
                    status         = ReminderStatus.pending
                )
                db.add(log)
                created_count += 1
        else:
            timings = []
            if med.dosage_timing:
                for slot in med.dosage_timing.lower().split(","):
                    slot = slot.strip()
                    if slot in timing_map:
                        timings.append(timing_map[slot])

            if not timings:
                timings = [8]

            for hour in timings:
                scheduled = datetime.combine(today, datetime.min.time()).replace(hour=hour)
                log = ReminderLog(
                    user_id        = current_user.id,
                    medication_id  = med.id,
                    scheduled_time = scheduled,
                    status         = ReminderStatus.pending
                )
                db.add(log)
                created_count += 1

    db.commit()

    return {
        "created_count":       created_count,
        "medicines_processed": medicines_processed
    }


@router.post("/mark-missed-overdue")
def mark_missed_overdue(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.patient, UserRole.admin))
):
    now = datetime.now()

    overdue_logs = db.query(ReminderLog).filter(
        ReminderLog.user_id        == current_user.id,
        ReminderLog.status         == ReminderStatus.pending,
        ReminderLog.scheduled_time < now - timedelta(hours=2)
    ).all()

    count = 0
    for log in overdue_logs:
        log.status = ReminderStatus.missed
        count += 1

    db.commit()

    return {"marked_missed": count}


@router.post("/", response_model=ReminderLogResponse, status_code=201)
def create_reminder_log(
    log_data: ReminderLogCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.patient, UserRole.admin))
):
    log = ReminderLog(
        user_id        = current_user.id,
        medication_id  = log_data.medication_id,
        scheduled_time = log_data.scheduled_time,
        status         = ReminderStatus.pending
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


@router.put("/{log_id}")
def update_reminder_status(
    log_id: int,
    update: ReminderStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.patient, UserRole.admin))
):
    log = db.query(ReminderLog).filter(
        ReminderLog.id      == log_id,
        ReminderLog.user_id == current_user.id
    ).first()

    if not log:
        raise HTTPException(status_code=404, detail="Reminder log not found")

    log.status      = update.status
    log.action_time = datetime.now()

    db.commit()
    db.refresh(log)

    # Recalculate streak after status change
    recalculate_patient_streak(db, current_user.id)

    med = db.query(Medication).filter(Medication.id == log.medication_id).first()

    # Check if all reminders for the day are taken
    today = date.today()
    pending_today = db.query(ReminderLog).filter(
        ReminderLog.user_id == current_user.id,
        ReminderLog.scheduled_time >= datetime.combine(today, datetime.min.time()),
        ReminderLog.scheduled_time <= datetime.combine(today, datetime.max.time()),
        ReminderLog.status == ReminderStatus.pending
    ).count()

    return {
        "log_id":         log.id,
        "medication_id":  log.medication_id,
        "medicine_name":  med.name if med else "Unknown",
        "strength":       med.strength if med else None,
        "scheduled_time": log.scheduled_time,
        "action_time":    log.action_time,
        "status":         log.status,
        "day_completed":  pending_today == 0 and update.status == ReminderStatus.taken
    }


@router.post("/{log_id}/snooze")
def snooze_reminder(
    log_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.patient, UserRole.admin))
):
    log = db.query(ReminderLog).filter(
        ReminderLog.id      == log_id,
        ReminderLog.user_id == current_user.id
    ).first()

    if not log:
        raise HTTPException(status_code=404, detail="Reminder log not found")

    log.snooze_count += 1
    log.snoozed_until = datetime.now() + timedelta(minutes=5)

    db.commit()
    db.refresh(log)

    # Escalation: if snooze_count >= 3, flag an alert (could integrate MissedDoseAlert)
    if log.snooze_count == 3:
        from app.models.missed_dose_alert import MissedDoseAlert
        from app.models.doctor_patient import DoctorPatient, RelationshipType
        
        # Notify caregivers
        caregivers = db.query(DoctorPatient).filter(
            DoctorPatient.patient_id == current_user.id,
            DoctorPatient.relationship_type == RelationshipType.caregiver
        ).all()
        
        for link in caregivers:
            alert = MissedDoseAlert(
                caregiver_id=link.doctor_id,
                patient_id=current_user.id,
                medication_id=log.medication_id,
                scheduled_time=log.scheduled_time,
                is_read=False
            )
            db.add(alert)
        db.commit()

    return {
        "log_id": log.id,
        "snooze_count": log.snooze_count,
        "snoozed_until": log.snoozed_until
    }