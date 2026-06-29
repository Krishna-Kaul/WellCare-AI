from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime

from app.core.database import get_db
from app.api.deps import require_role
from app.models.user import User, UserRole
from app.models.medication import Medication
from app.services.behavior_analyzer import compute_features
from app.services.ml_predictor import predict as ml_predict

router = APIRouter()


@router.get("/predict/{medication_id}")
def predict_medication(
    medication_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.patient, UserRole.admin))
):
    
    med = db.query(Medication).filter(
        Medication.id      == medication_id,
        Medication.user_id == current_user.id
    ).first()

    if not med:
        return {
            "medication_id":   medication_id,
            "medication_name": "Unknown",
            "error":           "Medication not found or not yours",
        }

    try:
        is_weekend = datetime.now().weekday() >= 5
        features   = compute_features(current_user.id, medication_id, db)
        result     = ml_predict(features, is_weekend)

        trend_direction = "stable"
        if features.adherence_trend_slope > 0.05:
            trend_direction = "improving"
        elif features.adherence_trend_slope < -0.05:
            trend_direction = "declining"

        return {
            "medication_id":           medication_id,
            "medication_name":         med.name,
            "miss_probability":        result.miss_probability,
            "risk_level":              result.risk_level,
            "early_by_minutes":        result.early_by_minutes,
            "should_repeat_reminder":  result.should_repeat_reminder,
            "repeat_after_minutes":    result.repeat_after_minutes,
            "should_escalate":         result.should_escalate,
            "reasoning":               result.reasoning,
            "features": {
                "consecutive_misses":      features.consecutive_misses,
                "consecutive_taken":       features.consecutive_taken,
                "adherence_pct":           round(features.overall_adherence_rate * 100, 1),
                "last_7day_adherence_pct": round(features.last_7day_adherence_rate * 100, 1),
                "trend_direction":         trend_direction,
                "total_logs":              features.total_logs,
            },
        }

    except Exception as e:
        return {
            "medication_id":          medication_id,
            "medication_name":        med.name,
            "miss_probability":       0.0,
            "risk_level":             "low",
            "early_by_minutes":       0,
            "should_repeat_reminder": False,
            "repeat_after_minutes":   0,
            "should_escalate":        False,
            "reasoning":              "Prediction unavailable",
            "error":                  str(e),
        }


@router.get("/risk-summary")
def get_risk_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.patient, UserRole.admin))
):
    """
    Risk profile for ALL active medications of logged-in patient.
    Sorted: high risk first.
    Useful for patient dashboard and doctor portal.
    """
    medicines = db.query(Medication).filter(
        Medication.user_id   == current_user.id,
        Medication.is_active == True
    ).all()

    is_weekend      = datetime.now().weekday() >= 5
    medications_out = []
    high_count      = 0
    medium_count    = 0
    low_count       = 0

    for med in medicines:
        try:
            features = compute_features(current_user.id, med.id, db)
            result   = ml_predict(features, is_weekend)

            if result.risk_level == "high":
                high_count += 1
            elif result.risk_level == "medium":
                medium_count += 1
            else:
                low_count += 1

            medications_out.append({
                "medication_id":      med.id,
                "medication_name":    med.name,
                "strength":           med.strength,
                "miss_probability":   result.miss_probability,
                "risk_level":         result.risk_level,
                "early_by_minutes":   result.early_by_minutes,
                "should_escalate":    result.should_escalate,
                "reasoning":          result.reasoning,
            })

        except Exception:
            low_count += 1
            medications_out.append({
                "medication_id":    med.id,
                "medication_name":  med.name,
                "strength":         med.strength,
                "miss_probability": 0.0,
                "risk_level":       "low",
                "early_by_minutes": 0,
                "should_escalate":  False,
                "reasoning":        "Prediction unavailable",
            })

    risk_order = {"high": 0, "medium": 1, "low": 2}
    medications_out.sort(key=lambda x: risk_order.get(x["risk_level"], 3))

    total = len(medicines)
    if high_count > 0:
        overall_risk = "high"
    elif medium_count > 0:
        overall_risk = "medium"
    else:
        overall_risk = "low"

    return {
        "summary": {
            "total_medications": total,
            "high_count":        high_count,
            "medium_count":      medium_count,
            "low_count":         low_count,
            "overall_risk":      overall_risk,
        },
        "medications": medications_out,
    }


@router.get("/adherence-features/{medication_id}")
def get_adherence_features(
    medication_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.patient, UserRole.admin))
):
    """
    Raw behavioral features for a medication.
    Useful for debugging, analytics UI, and doctor portal insights.
    """
    med = db.query(Medication).filter(
        Medication.id      == medication_id,
        Medication.user_id == current_user.id
    ).first()

    if not med:
        return {"error": "Medication not found or not yours"}

    try:
        features = compute_features(current_user.id, medication_id, db)

        trend_direction = "stable"
        if features.adherence_trend_slope > 0.05:
            trend_direction = "improving"
        elif features.adherence_trend_slope < -0.05:
            trend_direction = "declining"

        return {
            "medication_id":                  medication_id,
            "medication_name":                med.name,
            "overall_adherence_pct":          round(features.overall_adherence_rate * 100, 1),
            "last_7day_adherence_pct":        round(features.last_7day_adherence_rate * 100, 1),
            "last_30day_adherence_pct":       round(features.last_30day_adherence_rate * 100, 1),
            "consecutive_misses":             features.consecutive_misses,
            "consecutive_taken":              features.consecutive_taken,
            "avg_response_delay_minutes":     features.avg_response_delay_minutes,
            "median_response_delay_minutes":  features.median_response_delay_minutes,
            "no_response_rate_pct":           round(features.no_response_rate * 100, 1),
            "weekday_adherence_pct":          round(features.weekday_adherence_rate * 100, 1),
            "weekend_adherence_pct":          round(features.weekend_adherence_rate * 100, 1),
            "adherence_trend_slope":          features.adherence_trend_slope,
            "trend_direction":                trend_direction,
            "total_logs":                     features.total_logs,
            "taken_count":                    features.taken_count,
            "missed_count":                   features.missed_count,
        }

    except Exception as e:
        return {"medication_id": medication_id, "error": str(e)}
