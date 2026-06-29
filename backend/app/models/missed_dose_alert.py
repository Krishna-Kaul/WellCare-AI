from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean
from sqlalchemy.sql import func
from app.core.database import Base

class MissedDoseAlert(Base):
    __tablename__ = "missed_dose_alerts"

    id              = Column(Integer, primary_key=True, index=True)
    patient_id      = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    recipient_id    = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    medication_id   = Column(Integer, ForeignKey("medications.id", ondelete="CASCADE"), nullable=True)
    reminder_log_id = Column(Integer, ForeignKey("reminder_logs.id", ondelete="CASCADE"), nullable=True)
    message         = Column(String(500), nullable=False)
    is_read         = Column(Boolean, default=False)
    created_at      = Column(DateTime, server_default=func.now())