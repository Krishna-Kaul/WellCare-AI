from pydantic import BaseModel, EmailStr
from app.models.user import UserRole

class SignupRequest(BaseModel):
    name:     str
    email:    EmailStr
    password: str
    phone:    str | None = None
    role:     UserRole = UserRole.patient

class LoginRequest(BaseModel):
    email:    EmailStr
    password: str

class UserInfo(BaseModel):
    id:    int
    name:  str
    email: str
    role:  str

    model_config = {"from_attributes": True}

class TokenResponse(BaseModel):
    access_token: str
    token_type:   str = "bearer"
    role:         str
    name:         str
    user:         UserInfo
