import pytest
from datetime import datetime, timedelta
from unittest.mock import patch, MagicMock

from app.core.database import Base, SessionLocal
from app.models.user import User, UserRole
from app.models.medication import Medication
from app.models.reminder import ReminderLog, ReminderStatus
from app.services.scheduler import check_due_reminders
from app.core.config import settings

from tests.test_auth import engine, TestingSessionLocal

@pytest.fixture(scope="function")
def db_session():
    # Make sure tables are created
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)

def test_reminder_log_whatsapp_columns(db_session):
    # Verify columns exist on the ReminderLog table
    log = ReminderLog(
        user_id=1,
        medication_id=1,
        scheduled_time=datetime.now(),
        status=ReminderStatus.pending,
        whatsapp_sent=False,
        whatsapp_sent_at=None
    )
    db_session.add(log)
    db_session.commit()
    db_session.refresh(log)
    
    assert log.whatsapp_sent is False
    assert log.whatsapp_sent_at is None

@patch("app.services.scheduler.send_whatsapp_message")
@patch("app.services.scheduler.SessionLocal")
def test_check_due_reminders_dispatch(mock_session_local, mock_send, db_session):
    # Setup database local session override for check_due_reminders
    mock_session_local.return_value = db_session
    
    # Create test user
    patient = User(
        name="John Doe",
        email="john@example.com",
        password_hash="hash",
        role=UserRole.patient,
        phone="+919876543210"
    )
    db_session.add(patient)
    db_session.commit()
    db_session.refresh(patient)
    
    # Create test medication
    med = Medication(
        user_id=patient.id,
        name="Aspirin",
        is_active=True
    )
    db_session.add(med)
    db_session.commit()
    db_session.refresh(med)
    
    # Create pending reminder scheduled for now
    now = datetime.now()
    log = ReminderLog(
        user_id=patient.id,
        medication_id=med.id,
        scheduled_time=now,
        status=ReminderStatus.pending,
        whatsapp_sent=False
    )
    db_session.add(log)
    db_session.commit()
    db_session.refresh(log)
    log_id = log.id
    
    # Mock send_whatsapp_message to return True
    mock_send.return_value = True
    
    # Execute dispatch
    check_due_reminders()
    
    # Assert send_whatsapp_message was called once
    mock_send.assert_called_once()
    args, kwargs = mock_send.call_args
    assert kwargs["to_phone"] == "+919876543210"
    assert "John Doe" in kwargs["body"]
    assert "Aspirin" in kwargs["body"]
    
    # Refresh log and check database state updates using a fresh session
    check_db = TestingSessionLocal()
    refreshed_log = check_db.query(ReminderLog).filter(ReminderLog.id == log_id).first()
    assert refreshed_log.whatsapp_sent is True
    assert refreshed_log.whatsapp_sent_at is not None
    check_db.close()
    
    # Run again and assert no duplicate dispatch
    mock_send.reset_mock()
    check_due_reminders()
    mock_send.assert_not_called()

@patch("app.services.scheduler.send_whatsapp_message")
@patch("app.services.scheduler.SessionLocal")
def test_check_due_reminders_no_phone(mock_session_local, mock_send, db_session):
    mock_session_local.return_value = db_session
    
    # Create user with no phone number
    patient = User(
        name="No Phone",
        email="nophone@example.com",
        password_hash="hash",
        role=UserRole.patient,
        phone=None
    )
    db_session.add(patient)
    db_session.commit()
    db_session.refresh(patient)
    
    med = Medication(
        user_id=patient.id,
        name="Ibuprofen",
        is_active=True
    )
    db_session.add(med)
    db_session.commit()
    db_session.refresh(med)
    
    log = ReminderLog(
        user_id=patient.id,
        medication_id=med.id,
        scheduled_time=datetime.now(),
        status=ReminderStatus.pending,
        whatsapp_sent=False
    )
    db_session.add(log)
    db_session.commit()
    db_session.refresh(log)
    log_id = log.id
    
    # Execute dispatch
    check_due_reminders()
    
    # Assert send_whatsapp_message was NOT called
    mock_send.assert_not_called()
    
    # Assert it was NOT marked whatsapp_sent=True since the patient has no phone number
    check_db = TestingSessionLocal()
    refreshed_log = check_db.query(ReminderLog).filter(ReminderLog.id == log_id).first()
    assert refreshed_log.whatsapp_sent is False
    check_db.close()
