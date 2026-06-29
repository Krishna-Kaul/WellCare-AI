from sqlalchemy import Column, Integer, ForeignKey, DateTime, Enum, func
from app.core.database import Base
import enum

class RelationshipType(str, enum.Enum):
    doctor    = "doctor"
    caregiver = "caregiver"

class DoctorPatient(Base):
    __tablename__ = "doctor_patients"

    id                = Column(Integer, primary_key=True, index=True)
    doctor_id         = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    patient_id        = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    relationship_type = Column(Enum(RelationshipType), default=RelationshipType.doctor, nullable=False)
    created_at        = Column(DateTime, server_default=func.now())
