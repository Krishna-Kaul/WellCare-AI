from pydantic import BaseModel
from datetime import datetime
from app.models.prescription import PrescriptionStatus

class ExtractedMedicine(BaseModel):
    name:          str
    strength:      str | None = None
    dosage_timing: str | None = None
    duration_days: int | None = None
    before_meal:   bool = False
    notes:         str | None = None

class PrescriptionResponse(BaseModel):
    id:                  int
    user_id:             int
    file_path:           str
    status:              PrescriptionStatus
    extracted_medicines: list[ExtractedMedicine] = []
    created_at:          datetime

    model_config = {"from_attributes": True}
