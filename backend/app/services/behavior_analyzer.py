from dataclasses import dataclass, field
from datetime import datetime, timedelta, time
from statistics import mean, median
from sqlalchemy.orm import Session
from app.models.reminder import ReminderLog, ReminderStatus


@dataclass
class BehavioralFeatures:
    overall_adherence_rate:     float = 1.0
    last_7day_adherence_rate:   float = 1.0
    last_30day_adherence_rate:  float = 1.0
    consecutive_misses:         int   = 0
    consecutive_taken:          int   = 0
    avg_response_delay_minutes: float = 0.0
    median_response_delay_minutes: float = 0.0
    no_response_rate:           float = 0.0
    weekday_adherence_rate:     float = 1.0
    weekend_adherence_rate:     float = 1.0
    adherence_trend_slope:      float = 0.0
    total_logs:                 int   = 0
    taken_count:                int   = 0
    missed_count:               int   = 0


def compute_features(user_id: int, medication_id: int, db: Session, slot_time: time | None = None) -> BehavioralFeatures:
    query = db.query(ReminderLog).filter(
        ReminderLog.user_id       == user_id,
        ReminderLog.medication_id == medication_id,
    )

    logs_all = query.order_by(ReminderLog.scheduled_time.desc()).all()

    if slot_time is not None:
        logs = [l for l in logs_all if l.scheduled_time.time() == slot_time]
    else:
        logs = logs_all

    if not logs:
        return BehavioralFeatures()

    now    = datetime.now()
    total  = len(logs)
    taken  = [l for l in logs if l.status == ReminderStatus.taken]
    missed = [l for l in logs if l.status == ReminderStatus.missed]

    overall_adherence = len(taken) / total if total > 0 else 1.0

    cutoff_7  = now - timedelta(days=7)
    logs_7    = [l for l in logs if l.scheduled_time >= cutoff_7]
    taken_7   = [l for l in logs_7 if l.status == ReminderStatus.taken]
    last_7day = len(taken_7) / len(logs_7) if logs_7 else 1.0

    cutoff_30  = now - timedelta(days=30)
    logs_30    = [l for l in logs if l.scheduled_time >= cutoff_30]
    taken_30   = [l for l in logs_30 if l.status == ReminderStatus.taken]
    last_30day = len(taken_30) / len(logs_30) if logs_30 else 1.0

    consecutive_misses = 0
    for log in logs:
        if log.status == ReminderStatus.missed:
            consecutive_misses += 1
        else:
            break

    consecutive_taken = 0
    for log in logs:
        if log.status == ReminderStatus.taken:
            consecutive_taken += 1
        else:
            break

    delays = []
    for log in taken:
        if log.action_time and log.scheduled_time:
            delay = (log.action_time - log.scheduled_time).total_seconds() / 60
            delay = max(0.0, min(delay, 240.0))
            delays.append(delay)

    avg_delay    = mean(delays)    if delays else 0.0
    median_delay = median(delays)  if delays else 0.0

    no_response_rate = len(missed) / total if total > 0 else 0.0

    weekday_logs    = [l for l in logs if l.scheduled_time.weekday() < 5]
    weekend_logs    = [l for l in logs if l.scheduled_time.weekday() >= 5]

    weekday_taken   = [l for l in weekday_logs if l.status == ReminderStatus.taken]
    weekend_taken   = [l for l in weekend_logs if l.status == ReminderStatus.taken]

    weekday_rate = len(weekday_taken) / len(weekday_logs) if weekday_logs else 1.0
    weekend_rate = len(weekend_taken) / len(weekend_logs) if weekend_logs else 1.0

    trend_slope = _compute_trend_slope(logs, now)

    return BehavioralFeatures(
        overall_adherence_rate        = round(overall_adherence, 4),
        last_7day_adherence_rate      = round(last_7day, 4),
        last_30day_adherence_rate     = round(last_30day, 4),
        consecutive_misses            = consecutive_misses,
        consecutive_taken             = consecutive_taken,
        avg_response_delay_minutes    = round(avg_delay, 2),
        median_response_delay_minutes = round(median_delay, 2),
        no_response_rate              = round(no_response_rate, 4),
        weekday_adherence_rate        = round(weekday_rate, 4),
        weekend_adherence_rate        = round(weekend_rate, 4),
        adherence_trend_slope         = round(trend_slope, 4),
        total_logs                    = total,
        taken_count                   = len(taken),
        missed_count                  = len(missed),
    )


def _compute_trend_slope(logs: list, now: datetime) -> float:
    daily: dict[int, list] = {}

    for log in logs:
        days_ago = (now.date() - log.scheduled_time.date()).days
        if 0 <= days_ago <= 14:
            daily.setdefault(days_ago, []).append(log)

    if len(daily) < 3:
        return 0.0

    points = []
    for days_ago, day_logs in daily.items():
        taken_count = sum(1 for l in day_logs if l.status == ReminderStatus.taken)
        rate        = taken_count / len(day_logs)
        points.append((days_ago, rate))

    points.sort(key=lambda x: x[0])

    xs = [p[0] for p in points]
    ys = [p[1] for p in points]
    n  = len(xs)

    x_mean = mean(xs)
    y_mean = mean(ys)

    numerator   = sum((xs[i] - x_mean) * (ys[i] - y_mean) for i in range(n))
    denominator = sum((xs[i] - x_mean) ** 2 for i in range(n))

    if denominator == 0:
        return 0.0

    slope = numerator / denominator
    return -slope