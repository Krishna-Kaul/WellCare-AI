from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, date, timedelta

from app.core.database import get_db
from app.api.deps import require_role
from app.models.user import User, UserRole
from app.models.reminder import ReminderLog, ReminderStatus

router = APIRouter()


@router.get("/summary")
def get_adherence_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.patient, UserRole.admin))
):
    today = date.today()

    today_logs = db.query(ReminderLog).filter(
        ReminderLog.user_id        == current_user.id,
        ReminderLog.scheduled_time >= datetime.combine(today, datetime.min.time()),
        ReminderLog.scheduled_time <= datetime.combine(today, datetime.max.time())
    ).all()

    today_total = len(today_logs)
    today_taken = sum(1 for l in today_logs if l.status == ReminderStatus.taken)
    today_pct   = round((today_taken / today_total * 100) if today_total > 0 else 0)

    weekly = []
    for i in range(6, -1, -1):
        day = today - timedelta(days=i)

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

    return {
        "today_adherence":  today_pct,
        "today_taken":      today_taken,
        "today_total":      today_total,
        "weekly_breakdown": weekly,
        "weekly_average":   round(sum(d["adherence"] for d in weekly) / 7)
    }
