from sqlalchemy import Column, Integer, Enum, DateTime, ForeignKey, func, Boolean
from app.core.database import Base
import enum

class ReminderStatus(str, enum.Enum):
    pending = "pending"
    taken   = "taken"
    missed  = "missed"
    skipped = "skipped"

class ReminderLog(Base):
    __tablename__ = "reminder_logs"

    id               = Column(Integer, primary_key=True, index=True)
    user_id          = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    medication_id    = Column(Integer, ForeignKey("medications.id", ondelete="CASCADE"), nullable=False)
    scheduled_time   = Column(DateTime, nullable=False)
    status           = Column(Enum(ReminderStatus), default=ReminderStatus.pending)
    action_time      = Column(DateTime, nullable=True)
    snooze_count     = Column(Integer, default=0, nullable=False)
    snoozed_until    = Column(DateTime, nullable=True)
    created_at       = Column(DateTime, server_default=func.now())

    # WhatsApp tracking fields
    whatsapp_sent    = Column(Boolean, default=False, nullable=False)
    whatsapp_sent_at = Column(DateTime, nullable=True)

    # Vapi AI calling fields
    ai_call_sent     = Column(Boolean, default=False, nullable=False)
    ai_call_sent_at  = Column(DateTime, nullable=True)

