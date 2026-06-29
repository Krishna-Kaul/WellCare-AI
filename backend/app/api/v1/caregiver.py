from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, date, timedelta

from app.core.database import get_db
from app.api.deps import get_current_caregiver
from app.models.user import User, UserRole
from app.services.behavior_analyzer import compute_features
from app.services.ml_predictor import predict as ml_predict
from app.models.reminder import ReminderLog, ReminderStatus
from app.models.medication import Medication
from app.models.doctor_patient import DoctorPatient, RelationshipType
from app.models.missed_dose_alert import MissedDoseAlert

router = APIRouter()


@router.get("/patients")
def get_my_patients(
    db: Session = Depends(get_db),
    current_caregiver: User = Depends(get_current_caregiver)
):
    links = db.query(DoctorPatient).filter(
        DoctorPatient.doctor_id         == current_caregiver.id,
        DoctorPatient.relationship_type == RelationshipType.caregiver
    ).all()

    patient_ids = [link.patient_id for link in links]
    patients    = db.query(User).filter(User.id.in_(patient_ids)).all()

    result = []
    for patient in patients:
        today = date.today()
        today_logs = db.query(ReminderLog).filter(
            ReminderLog.user_id        == patient.id,
            ReminderLog.scheduled_time >= datetime.combine(today, datetime.min.time()),
            ReminderLog.scheduled_time <= datetime.combine(today, datetime.max.time())
        ).all()

        missed_today = sum(1 for log in today_logs if log.status == ReminderStatus.missed)
        taken_today = sum(1 for log in today_logs if log.status == ReminderStatus.taken)
        adherence_pct = round((taken_today / len(today_logs) * 100) if today_logs else 0)

        result.append({
            "id":              patient.id,
            "name":            patient.name,
            "email":           patient.email,
            "missed_today":    missed_today,
            "adherence":       adherence_pct,
            "needs_attention": missed_today > 0
        })

    return result


@router.get("/patients/{patient_id}/medications")
def get_patient_medications(
    patient_id: int,
    db: Session = Depends(get_db),
    current_caregiver: User = Depends(get_current_caregiver)
):
    link = db.query(DoctorPatient).filter(
        DoctorPatient.doctor_id         == current_caregiver.id,
        DoctorPatient.patient_id        == patient_id,
        DoctorPatient.relationship_type == RelationshipType.caregiver
    ).first()

    if not link:
        raise HTTPException(status_code=403, detail="This patient is not linked to your account")

    medicines = db.query(Medication).filter(
        Medication.user_id   == patient_id,
        Medication.is_active == True
    ).all()

    return medicines


@router.get("/patients/{patient_id}/reminders")
def get_patient_reminders(
    patient_id: int,
    db: Session = Depends(get_db),
    current_caregiver: User = Depends(get_current_caregiver)
):
    link = db.query(DoctorPatient).filter(
        DoctorPatient.doctor_id         == current_caregiver.id,
        DoctorPatient.patient_id        == patient_id,
        DoctorPatient.relationship_type == RelationshipType.caregiver
    ).first()

    if not link:
        raise HTTPException(status_code=403, detail="This patient is not linked to your account")

    today = date.today()
    today_logs = db.query(ReminderLog).join(Medication, ReminderLog.medication_id == Medication.id).filter(
        ReminderLog.user_id        == patient_id,
        ReminderLog.scheduled_time >= datetime.combine(today, datetime.min.time()),
        ReminderLog.scheduled_time <= datetime.combine(today, datetime.max.time()),
        Medication.is_active       == True
    ).order_by(ReminderLog.scheduled_time).all()

    todays_schedule = []
    is_weekend = today.weekday() >= 5
    for log in today_logs:
        med = db.query(Medication).filter(Medication.id == log.medication_id).first()
        slot_time = log.scheduled_time.time()
        try:
            features = compute_features(patient_id, log.medication_id, db, slot_time=slot_time)
            ml_res = ml_predict(features, is_weekend)
            early_by_minutes = ml_res.early_by_minutes
        except Exception:
            early_by_minutes = 0

        todays_schedule.append({
            "id":             log.id,
            "medicine_name":  med.name if med else "Unknown",
            "strength":       med.strength if med else "",
            "scheduled_time": log.scheduled_time.isoformat(),
            "meal_timing":    "before" if (med and med.before_meal) else "after" if (med and med.before_meal is False) else "",
            "status":         log.status.value if hasattr(log.status, 'value') else log.status,
            "is_adaptive":    early_by_minutes > 0,
            "early_by_minutes": early_by_minutes,
            "snooze_count":   log.snooze_count,
        })

    return todays_schedule


@router.get("/patients/{patient_id}/adherence")
def get_patient_adherence(
    patient_id: int,
    db: Session = Depends(get_db),
    current_caregiver: User = Depends(get_current_caregiver)
):
    link = db.query(DoctorPatient).filter(
        DoctorPatient.doctor_id         == current_caregiver.id,
        DoctorPatient.patient_id        == patient_id,
        DoctorPatient.relationship_type == RelationshipType.caregiver
    ).first()

    if not link:
        raise HTTPException(status_code=403, detail="This patient is not linked to your account")

    today  = date.today()

    today_logs = db.query(ReminderLog).filter(
        ReminderLog.user_id        == patient_id,
        ReminderLog.scheduled_time >= datetime.combine(today, datetime.min.time()),
        ReminderLog.scheduled_time <= datetime.combine(today, datetime.max.time())
    ).all()

    today_total = len(today_logs)
    today_taken = sum(1 for l in today_logs if l.status == ReminderStatus.taken)
    today_pct   = round((today_taken / today_total * 100) if today_total > 0 else 0)

    weekly = []
    for i in range(6, -1, -1):
        day      = today - timedelta(days=i)
        day_logs = db.query(ReminderLog).filter(
            ReminderLog.user_id        == patient_id,
            ReminderLog.scheduled_time >= datetime.combine(day, datetime.min.time()),
            ReminderLog.scheduled_time <= datetime.combine(day, datetime.max.time())
        ).all()

        total = len(day_logs)
        taken = sum(1 for l in day_logs if l.status == ReminderStatus.taken)
        pct   = round((taken / total * 100) if total > 0 else 0)

        weekly.append({
            "date":      day.isoformat(),
            "day":       day.strftime("%a"),
            "adherence": pct,
            "total":     total,
            "taken":     taken
        })

    return {
        "patient_id":       patient_id,
        "today_adherence":  today_pct,
        "weekly_breakdown": weekly,
        "weekly_average":   round(sum(d["adherence"] for d in weekly) / 7)
    }


@router.get("/patients/{patient_id}/missed-alerts")
def get_missed_alerts(
    patient_id: int,
    db: Session = Depends(get_db),
    current_caregiver: User = Depends(get_current_caregiver)
):
    link = db.query(DoctorPatient).filter(
        DoctorPatient.doctor_id         == current_caregiver.id,
        DoctorPatient.patient_id        == patient_id,
        DoctorPatient.relationship_type == RelationshipType.caregiver
    ).first()

    if not link:
        raise HTTPException(status_code=403, detail="This patient is not linked to your account")

    seven_days_ago = datetime.combine(
        date.today() - timedelta(days=7), datetime.min.time()
    )

    logs = db.query(ReminderLog).filter(
        ReminderLog.user_id        == patient_id,
        ReminderLog.scheduled_time >= seven_days_ago
    ).order_by(ReminderLog.scheduled_time.desc()).all()

    consecutive_missed = 0
    for log in logs:
        if log.status == ReminderStatus.missed:
            consecutive_missed += 1
        else:
            break

    missed_alerts = db.query(MissedDoseAlert).filter(
        MissedDoseAlert.recipient_id == current_caregiver.id,
        MissedDoseAlert.patient_id == patient_id
    ).order_by(MissedDoseAlert.created_at.desc()).all()

    result_logs = []
    for alert in missed_alerts:
        med = db.query(Medication).filter(Medication.id == alert.medication_id).first()
        log = db.query(ReminderLog).filter(ReminderLog.id == alert.reminder_log_id).first()
        result_logs.append({
            "id":             alert.id,
            "medication_id":  alert.medication_id,
            "medication_name": med.name if med else "Unknown",
            "message":        alert.message,
            "is_read":        alert.is_read,
            "scheduled_time": log.scheduled_time if log else alert.created_at,
            "status":         "missed"
        })

    return {
        "patient_id":         patient_id,
        "consecutive_missed": consecutive_missed,
        "needs_escalation":   consecutive_missed >= 3,
        "risk_level":         "high" if consecutive_missed >= 5 else "medium" if consecutive_missed >= 3 else "low",
        "missed_logs":        result_logs
    }


@router.post("/patients/{patient_id}/link")
def link_patient(
    patient_id: int,
    db: Session = Depends(get_db),
    current_caregiver: User = Depends(get_current_caregiver)
):
    patient = db.query(User).filter(
        User.id   == patient_id,
        User.role == UserRole.patient
    ).first()

    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    existing = db.query(DoctorPatient).filter(
        DoctorPatient.doctor_id  == current_caregiver.id,
        DoctorPatient.patient_id == patient_id
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail="Patient already linked")

    link = DoctorPatient(
        doctor_id         = current_caregiver.id,
        patient_id        = patient_id,
        relationship_type = RelationshipType.caregiver
    )
    db.add(link)
    db.commit()

    return {"message": f"Patient {patient.name} linked successfully"}


@router.delete("/patients/{patient_id}/unlink", status_code=204)
def unlink_patient(
    patient_id: int,
    db: Session = Depends(get_db),
    current_caregiver: User = Depends(get_current_caregiver)
):
    link = db.query(DoctorPatient).filter(
        DoctorPatient.doctor_id  == current_caregiver.id,
        DoctorPatient.patient_id == patient_id
    ).first()

    if not link:
        raise HTTPException(status_code=404, detail="Link not found")

    db.delete(link)
    db.commit()