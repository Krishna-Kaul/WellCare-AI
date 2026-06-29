from sqlalchemy import Column, Integer, String, Enum, DateTime, func
from app.core.database import Base
import enum

class UserRole(str, enum.Enum):
    patient   = "patient"
    doctor    = "doctor"
    caregiver = "caregiver"
    admin     = "admin"

class User(Base):
    __tablename__ = "users"

    id             = Column(Integer, primary_key=True, index=True)
    name           = Column(String(100), nullable=False)
    email          = Column(String(150), unique=True, index=True, nullable=False)
    phone          = Column(String(15), nullable=True)
    password_hash  = Column(String(255), nullable=False)
    role           = Column(Enum(UserRole), default=UserRole.patient, nullable=False)
    created_at     = Column(DateTime, server_default=func.now())
    updated_at     = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Patient Recovery Streak & Motivation Engine
    current_streak      = Column(Integer, default=0)
    longest_streak      = Column(Integer, default=0)
    streak_last_updated = Column(DateTime, nullable=True)
    recovery_score      = Column(Integer, default=0)  # Acts as 'XP'
    adherence_momentum  = Column(String(50), default="neutral")  # positive, recovering, neutral, at_risk
    streak_status       = Column(String(50), default="active")   # active, protected, broken
