from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime, date, timedelta

from app.core.database import get_db
from app.api.deps import require_role
from app.models.user import User, UserRole
from app.models.reminder import ReminderLog, ReminderStatus
from app.models.medication import Medication

router = APIRouter()


@router.get("/dashboard")
def get_patient_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.patient, UserRole.admin))
):
    today = date.today()

    today_logs = db.query(ReminderLog).filter(
        ReminderLog.user_id        == current_user.id,
        ReminderLog.scheduled_time >= datetime.combine(today, datetime.min.time()),
        ReminderLog.scheduled_time <= datetime.combine(today, datetime.max.time())
    ).all()

    today_total  = len(today_logs)
    today_taken  = sum(1 for l in today_logs if l.status == ReminderStatus.taken)
    today_missed = sum(1 for l in today_logs if l.status == ReminderStatus.missed)
    today_pct    = round((today_taken / today_total * 100) if today_total > 0 else 0)

    weekly = []
    for i in range(6, -1, -1):
        day      = today - timedelta(days=i)
        day_logs = db.query(ReminderLog).filter(
            ReminderLog.user_id        == current_user.id,
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

    medicines = db.query(Medication).filter(
        Medication.user_id   == current_user.id,
        Medication.is_active == True
    ).all()

    todays_schedule = []
    for log in today_logs:
        med = db.query(Medication).filter(
            Medication.id == log.medication_id
        ).first()
        todays_schedule.append({
            "log_id":         log.id,
            "medication_id":  log.medication_id,
            "medicine_name":  med.name if med else "Unknown",
            "strength":       med.strength if med else None,
            "scheduled_time": log.scheduled_time,
            "status":         log.status.value,
            "before_meal":    med.before_meal if med else None,
        })

    return {
        "user": {
            "id":    current_user.id,
            "name":  current_user.name,
            "email": current_user.email,
            "role":  current_user.role,
            "current_streak": current_user.current_streak,
            "longest_streak": current_user.longest_streak,
            "recovery_score": current_user.recovery_score,
            "adherence_momentum": current_user.adherence_momentum,
            "streak_status": current_user.streak_status,
        },
        "today_summary": {
            "adherence_pct": today_pct,
            "total":         today_total,
            "taken":         today_taken,
            "missed":        today_missed,
            "pending":       today_total - today_taken - today_missed,
        },
        "todays_schedule": todays_schedule,
        "weekly_breakdown": weekly,
        "weekly_average":   round(sum(d["adherence"] for d in weekly) / 7),
        "active_medicines": [
            {
                "id":            m.id,
                "name":          m.name,
                "strength":      m.strength,
                "dosage_timing": m.dosage_timing,
                "before_meal":   m.before_meal,
            }
            for m in medicines
        ],
        "total_medicines": len(medicines),
    }

@router.get("/refill-alerts")
def get_refill_alerts(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.patient, UserRole.admin))
):
    from datetime import timedelta

    today     = date.today()
    medicines = db.query(Medication).filter(
        Medication.user_id    == current_user.id,
        Medication.is_active  == True,
        Medication.duration_days != None
    ).all()

    alerts = []
    for med in medicines:
        end_date       = med.created_at.date() + timedelta(days=med.duration_days)
        days_remaining = (end_date - today).days

        if days_remaining <= 14:
            if days_remaining <= 3:
                severity = "critical"
                message  = f"Only {days_remaining} days of supply left — refill immediately."
            elif days_remaining <= 7:
                severity = "warning"
                message  = f"{days_remaining} days remaining — consider ordering this week."
            else:
                severity = "info"
                message  = f"Refill scheduled for {end_date.strftime('%A')}."

            alerts.append({
                "id":            str(med.id),
                "medicine_name": med.name,
                "message":       message,
                "severity":      severity,
                "days_left":     days_remaining
            })

    alerts.sort(key=lambda x: x["days_left"])

    return alerts
