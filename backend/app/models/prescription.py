from sqlalchemy import Column, Integer, String, Text, Enum, ForeignKey, DateTime, func
from app.core.database import Base
import enum

class PrescriptionStatus(str, enum.Enum):
    processing = "processing"
    completed  = "completed"
    failed     = "failed"

class Prescription(Base):
    __tablename__ = "prescriptions"

    id           = Column(Integer, primary_key=True, index=True)
    user_id      = Column(Integer, ForeignKey("users.id"), nullable=False)
    file_path    = Column(String(500), nullable=False)
    raw_ocr_text = Column(Text, nullable=True)
    status       = Column(Enum(PrescriptionStatus), default=PrescriptionStatus.processing)
    created_at   = Column(DateTime, server_default=func.now())
