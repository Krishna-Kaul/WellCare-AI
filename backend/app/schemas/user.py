from pydantic import BaseModel, EmailStr
from datetime import datetime
from app.models.user import UserRole

class UserResponse(BaseModel):
    id:         int
    name:       str
    email:      EmailStr
    phone:      str | None
    role:       UserRole
    created_at: datetime

    model_config = {"from_attributes": True}

class UserUpdateRequest(BaseModel):
    name:  str | None = None
    phone: str | None = None
