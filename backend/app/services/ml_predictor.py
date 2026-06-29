import math
from dataclasses import dataclass
from app.services.behavior_analyzer import BehavioralFeatures


@dataclass
class PredictionResult:
    miss_probability:       float
    risk_level:             str
    early_by_minutes:       int
    should_repeat_reminder: bool
    repeat_after_minutes:   int
    should_escalate:        bool
    reasoning:              str


WEIGHTS = {
    "consecutive_misses":    0.30,
    "last_7day_adherence":   0.25,
    "no_response_rate":      0.15,
    "overall_adherence":     0.12,
    "trend":                 0.10,
    "weekend_penalty":       0.08,
}


def _sigmoid(x: float) -> float:
    return 1.0 / (1.0 + math.exp(-x))


def _normalize_consecutive_misses(misses: int) -> float:
    return min(misses / 5.0, 1.0)


def _normalize_trend(slope: float) -> float:
    clamped = max(-1.0, min(1.0, slope))
    return (1.0 - clamped) / 2.0


def _weekend_penalty(features: BehavioralFeatures, is_weekend: bool) -> float:
    if not is_weekend:
        return 1.0 - features.weekday_adherence_rate
    return 1.0 - features.weekend_adherence_rate


def predict(features: BehavioralFeatures, is_weekend: bool) -> PredictionResult:
    
   
    if features.total_logs == 0:
        return PredictionResult(
            miss_probability       = 0.0,
            risk_level             = "low",
            early_by_minutes       = 0,
            should_repeat_reminder = False,
            repeat_after_minutes   = 0,
            should_escalate        = False,
            reasoning              = "No history yet — default low risk",
        )

   
    if features.total_logs < 3:
        return PredictionResult(
            miss_probability       = 0.0,
            risk_level             = "low",
            early_by_minutes       = 0,
            should_repeat_reminder = False,
            repeat_after_minutes   = 0,
            should_escalate        = False,
            reasoning              = f"Insufficient history ({features.total_logs} logs) — need at least 3",
        )

    f_consecutive = _normalize_consecutive_misses(features.consecutive_misses)
    f_last_7day   = 1.0 - features.last_7day_adherence_rate
    f_no_response = features.no_response_rate
    f_overall     = 1.0 - features.overall_adherence_rate
    f_trend       = _normalize_trend(features.adherence_trend_slope)
    f_weekend     = _weekend_penalty(features, is_weekend)

    raw_score = (
        WEIGHTS["consecutive_misses"]  * f_consecutive +
        WEIGHTS["last_7day_adherence"] * f_last_7day   +
        WEIGHTS["no_response_rate"]    * f_no_response +
        WEIGHTS["overall_adherence"]   * f_overall     +
        WEIGHTS["trend"]               * f_trend       +
        WEIGHTS["weekend_penalty"]     * f_weekend
    )

    miss_probability = round(_sigmoid(raw_score * 6 - 2.5), 4)

    if miss_probability < 0.40:
        risk_level = "low"
    elif miss_probability < 0.70:
        risk_level = "medium"
    else:
        risk_level = "high"

    # Base early minutes based on risk probability
    base_early = 0
    if miss_probability > 0.85:
        base_early = 30
    elif miss_probability > 0.70:
        base_early = 20
    elif miss_probability > 0.55:
        base_early = 15

    early_by_minutes = 0
    # Strict threshold: must have consecutive misses to trigger
    if features.consecutive_misses >= 2 and miss_probability > 0.55:
        early_by_minutes = base_early
    # Gradual reversion if they start taking it again
    elif features.consecutive_taken == 1 and base_early > 0 and miss_probability > 0.60:
        early_by_minutes = max(0, base_early - 10)
    elif features.consecutive_taken == 2 and base_early > 0 and miss_probability > 0.60:
        early_by_minutes = max(0, base_early - 20)

    should_repeat_reminder = miss_probability > 0.65
    repeat_after_minutes   = 15 if miss_probability > 0.80 else 20
    should_escalate        = miss_probability > 0.85 and features.consecutive_misses >= 3
    reasoning              = _build_reasoning(miss_probability, risk_level, features, early_by_minutes, should_escalate)

    return PredictionResult(
        miss_probability       = miss_probability,
        risk_level             = risk_level,
        early_by_minutes       = early_by_minutes,
        should_repeat_reminder = should_repeat_reminder,
        repeat_after_minutes   = repeat_after_minutes if should_repeat_reminder else 0,
        should_escalate        = should_escalate,
        reasoning              = reasoning,
    )


def _build_reasoning(miss_prob: float, risk_level: str, features: BehavioralFeatures, early_by: int, escalate: bool) -> str:
    parts = []
    pct   = round(miss_prob * 100)

    parts.append(f"Miss probability: {pct}% ({risk_level} risk)")

    if features.consecutive_misses > 0:
        parts.append(f"{features.consecutive_misses} consecutive missed dose(s)")

    if features.last_7day_adherence_rate < 0.7:
        parts.append(f"Last 7-day adherence: {round(features.last_7day_adherence_rate * 100)}%")

    if features.adherence_trend_slope < -0.05:
        parts.append("Adherence is declining")
    elif features.adherence_trend_slope > 0.05:
        parts.append("Adherence is improving")

    if early_by > 0:
        parts.append(f"Reminder sent {early_by} minutes early")

    if escalate:
        parts.append("Escalation triggered — doctor/caregiver notified")

    return " | ".join(parts)