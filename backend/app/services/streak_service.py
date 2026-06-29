from sqlalchemy.orm import Session
from datetime import datetime, date, timedelta
from app.models.user import User
from app.models.reminder import ReminderLog, ReminderStatus

def recalculate_patient_streak(db: Session, user_id: int):
    """
    Idempotently recalculates the patient's current streak, longest streak,
    recovery score, and momentum based on their entire reminder history.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return

    # Fetch all logs for the user, ordered by scheduled_time
    logs = db.query(ReminderLog).filter(
        ReminderLog.user_id == user_id
    ).order_by(ReminderLog.scheduled_time.asc()).all()

    if not logs:
        return

    # Group logs by date
    daily_stats = {}
    for log in logs:
        day = log.scheduled_time.date()
        if day not in daily_stats:
            daily_stats[day] = {"total": 0, "taken": 0}
        
        daily_stats[day]["total"] += 1
        if log.status == ReminderStatus.taken:
            daily_stats[day]["taken"] += 1

    # Ensure we check up to today (even if no logs today, gap days might break streak)
    # Actually, if there are no logs for a day, does it break the streak? 
    # Usually no. We only consider days where total > 0.
    
    current_streak = 0
    longest_streak = 0
    recovery_score = 0
    momentum = "neutral"
    status = "active"

    # Sort days
    sorted_days = sorted(daily_stats.keys())
    
    for day in sorted_days:
        stats = daily_stats[day]
        total = stats["total"]
        taken = stats["taken"]
        
        if total == 0:
            continue
            
        adherence_pct = (taken / total) * 100
        
        # Calculate score
        recovery_score += taken * 2  # Base XP for taking medicine
        
        if adherence_pct >= 100:
            current_streak += 1
            recovery_score += 10 # Bonus XP for perfect day
            momentum = "positive"
            status = "active"
        elif adherence_pct > 0:
            # Partial adherence breaks the streak, but gives some XP
            current_streak = 0
            momentum = "recovering"
            status = "broken"
        else:
            # Complete miss
            current_streak = 0
            momentum = "at_risk"
            status = "broken"
            
        if current_streak > longest_streak:
            longest_streak = current_streak

    # Handle gap between last log day and today
    today = date.today()
    if sorted_days:
        last_day = sorted_days[-1]
        if last_day < today:
            # If the last day with logs was before today, should we break the streak?
            # It depends if they had scheduled meds in between. We already fetched ALL logs.
            # So if they had no logs scheduled between last_day and today, streak is preserved!
            pass

    user.current_streak = current_streak
    user.longest_streak = max(user.longest_streak, longest_streak)
    user.recovery_score = recovery_score
    user.adherence_momentum = momentum
    user.streak_status = status
    user.streak_last_updated = datetime.now()

    db.commit()
    return user
