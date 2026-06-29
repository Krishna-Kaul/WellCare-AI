from sqlalchemy import Column, Integer, String, Text, Boolean, ForeignKey, DateTime, func
from app.core.database import Base

class Medication(Base):
    __tablename__ = "medications"

    id               = Column(Integer, primary_key=True, index=True)
    user_id          = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name             = Column(String(200), nullable=False)
    strength         = Column(String(50),  nullable=True)
    dosage_timing    = Column(String(100), nullable=True)
    duration_days    = Column(Integer,     nullable=True)
    before_meal      = Column(Boolean,     default=False)
    notes            = Column(Text,        nullable=True)
    custom_times     = Column(String(200), nullable=True)    # e.g. "09:00,14:30,21:00"
    source           = Column(String(20),  default="manual")
    is_active        = Column(Boolean,     default=True)
    created_at       = Column(DateTime, server_default=func.now())
