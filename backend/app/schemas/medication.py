from pydantic import BaseModel
from datetime import datetime

class MedicationCreate(BaseModel):
    name:          str
    strength:      str | None = None
    dosage_timing: str | None = None
    duration_days: int | None = None
    before_meal:   bool = False
    notes:         str | None = None
    custom_times:  str | None = None

class MedicationUpdate(BaseModel):
    name:          str | None = None
    strength:      str | None = None
    dosage_timing: str | None = None
    duration_days: int | None = None
    before_meal:   bool | None = None
    notes:         str | None = None
    custom_times:  str | None = None
    is_active:     bool | None = None

class MedicationResponse(BaseModel):
    id:            int
    user_id:       int
    name:          str
    strength:      str | None
    dosage_timing: str | None
    duration_days: int | None
    before_meal:   bool
    notes:         str | None
    custom_times:  str | None
    source:        str
    is_active:     bool
    created_at:    datetime

    model_config = {"from_attributes": True}
