from datetime import datetime, date, time
from sqlalchemy.orm import Session

from app.models.reminder import ReminderLog, ReminderStatus


def parse_timing_to_times(dosage_timing: str) -> list[time]:
    """
    dosage_timing string se aaj ke scheduled times nikalta hai.

    Examples:
        "once daily"       → [08:00]
        "twice daily"      → [08:00, 20:00]
        "three times daily"→ [08:00, 14:00, 20:00]
        "four times daily" → [08:00, 12:00, 16:00, 20:00]
        "morning"          → [08:00]
        "night"            → [20:00]
        "morning, night"   → [08:00, 20:00]
        "morning, afternoon, night" → [08:00, 14:00, 20:00]
    """
    if not dosage_timing:
        return [time(8, 0)] 
    d = dosage_timing.lower().strip()

    if "four times" in d or "4 times" in d or "qid" in d:
        return [time(8, 0), time(12, 0), time(16, 0), time(20, 0)]

    if "three times" in d or "3 times" in d or "thrice" in d or "tid" in d:
        return [time(8, 0), time(14, 0), time(20, 0)]

    if "twice" in d or "2 times" in d or "bid" in d or "two times" in d:
        return [time(8, 0), time(20, 0)]

    if "once" in d or "1 time" in d or "od" in d or "daily" in d:
        # Check for specific time of day
        if "night" in d or "bedtime" in d or "evening" in d:
            return [time(20, 0)]
        if "afternoon" in d:
            return [time(14, 0)]
        return [time(8, 0)]  # default once = morning

    # Named slot keywords — can be combined (e.g., "morning, night")
    slots = []
    if "morning" in d or "breakfast" in d:
        slots.append(time(8, 0))
    if "afternoon" in d or "lunch" in d or "noon" in d:
        slots.append(time(14, 0))
    if "evening" in d:
        slots.append(time(18, 0))
    if "night" in d or "bedtime" in d or "dinner" in d:
        slots.append(time(20, 0))

    return slots if slots else [time(8, 0)]  # fallback


# ── Main generator function ──
def generate_todays_reminders(
    medication_id: int,
    user_id: int,
    dosage_timing: str,
    duration_days: int | None,
    db: Session,
    custom_times: str | None = None,
) -> list[ReminderLog]:
    """
    Ek medication ke liye aaj ke reminder logs banata hai.
    Already existing logs ko skip karta hai (duplicate prevention).

    Returns: list of created ReminderLog objects
    """
    today = date.today()
    if custom_times:
        parsed = []
        for t in custom_times.split(","):
            t = t.strip()
            try:
                h, m = t.split(":")
                parsed.append(time(int(h), int(m)))
            except Exception:
                pass
        times = parsed if parsed else parse_timing_to_times(dosage_timing)
    else:
        times = parse_timing_to_times(dosage_timing)

    created_logs = []

    for t in times:
        scheduled_dt = datetime.combine(today, t)

        # Duplicate check — same medication, same time already exists?
        existing = db.query(ReminderLog).filter(
            ReminderLog.user_id       == user_id,
            ReminderLog.medication_id == medication_id,
            ReminderLog.scheduled_time == scheduled_dt,
        ).first()

        if existing:
            continue  # Already hai, skip karo

        log = ReminderLog(
            user_id        = user_id,
            medication_id  = medication_id,
            scheduled_time = scheduled_dt,
            status         = ReminderStatus.pending,
        )
        db.add(log)
        created_logs.append(log)

    if created_logs:
        db.commit()
        for log in created_logs:
            db.refresh(log)

    return created_logs


def generate_reminders_for_date_range(
    medication_id: int,
    user_id: int,
    dosage_timing: str,
    duration_days: int,
    db: Session,
    start_date: date | None = None,
    custom_times: str | None = None,
) -> int:
    """
    Poore duration ke liye reminders generate karta hai.
    Useful jab frontend "generate all reminders" button add kare.

    Returns: total logs created count
    """
    from datetime import timedelta

    start = start_date or date.today()
    if custom_times:
        parsed = []
        for t in custom_times.split(","):
            t = t.strip()
            try:
                h, m = t.split(":")
                parsed.append(time(int(h), int(m)))
            except Exception:
                pass
        times = parsed if parsed else parse_timing_to_times(dosage_timing)
    else:
        times = parse_timing_to_times(dosage_timing)
    total_created = 0

    for day_offset in range(duration_days):
        current_date = start + timedelta(days=day_offset)

        for t in times:
            scheduled_dt = datetime.combine(current_date, t)

            existing = db.query(ReminderLog).filter(
                ReminderLog.user_id        == user_id,
                ReminderLog.medication_id  == medication_id,
                ReminderLog.scheduled_time == scheduled_dt,
            ).first()

            if existing:
                continue

            log = ReminderLog(
                user_id        = user_id,
                medication_id  = medication_id,
                scheduled_time = scheduled_dt,
                status         = ReminderStatus.pending,
            )
            db.add(log)
            total_created += 1

    db.commit()
    return total_created
