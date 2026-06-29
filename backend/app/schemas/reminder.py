from pydantic import BaseModel
from datetime import datetime
from app.models.reminder import ReminderStatus

class ReminderLogCreate(BaseModel):
    medication_id:  int
    scheduled_time: datetime

class ReminderStatusUpdate(BaseModel):
    status: ReminderStatus

class ReminderLogResponse(BaseModel):
    id:             int
    user_id:        int
    medication_id:  int
    scheduled_time: datetime
    status:         ReminderStatus
    action_time:    datetime | None
    created_at:     datetime

    model_config = {"from_attributes": True}
