from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.triggers.cron import CronTrigger
from datetime import datetime, timedelta
import logging

from app.core.database import SessionLocal
from app.models.reminder import ReminderLog, ReminderStatus
from app.models.doctor_patient import DoctorPatient
from app.models.missed_dose_alert import MissedDoseAlert
from app.models.medication import Medication
from app.models.user import User, UserRole
from app.services.reminder_generator import generate_todays_reminders
from app.core.config import settings
from app.services.whatsapp_service import send_whatsapp_message
from app.services.vapi_service import trigger_vapi_call

logger = logging.getLogger(__name__)


scheduler = BackgroundScheduler()

def detect_missed_doses():
    """Runs periodically to detect pending reminders that are overdue and mark them as missed."""
    db = SessionLocal()
    try:
        now = datetime.now()
        # Find pending reminders > 2 hours overdue
        overdue_logs = db.query(ReminderLog).filter(
            ReminderLog.status == ReminderStatus.pending,
            ReminderLog.scheduled_time < now - timedelta(hours=2)
        ).all()

        for log in overdue_logs:
            log.status = ReminderStatus.missed
            
            med = db.query(Medication).filter(Medication.id == log.medication_id).first()
            med_name = med.name if med else "Unknown Medication"
            time_str = log.scheduled_time.strftime('%I:%M %p')
            
            msg = f"Missed Dose: {med_name} scheduled at {time_str} was not taken."

            # Find all linked caregivers and doctors
            links = db.query(DoctorPatient).filter(DoctorPatient.patient_id == log.user_id).all()
            recipients = [link.doctor_id for link in links]
            
            # Also notify the patient themselves
            recipients.append(log.user_id)

            for rec_id in set(recipients):
                # Avoid duplicate alerts
                existing = db.query(MissedDoseAlert).filter(
                    MissedDoseAlert.recipient_id == rec_id,
                    MissedDoseAlert.reminder_log_id == log.id
                ).first()
                if not existing:
                    alert = MissedDoseAlert(
                        patient_id=log.user_id,
                        recipient_id=rec_id,
                        medication_id=log.medication_id,
                        reminder_log_id=log.id,
                        message=msg
                    )
                    db.add(alert)
        db.commit()
    except Exception as e:
        logger.error(f"Error in detect_missed_doses: {e}")
        db.rollback()
    finally:
        db.close()


def generate_midnight_reminders():
    """Runs at midnight to generate reminders for the new day for all active medications."""
    db = SessionLocal()
    try:
        patients = db.query(User).filter(User.role == UserRole.patient).all()
        for p in patients:
            medicines = db.query(Medication).filter(
                Medication.user_id == p.id,
                Medication.is_active == True
            ).all()
            for med in medicines:
                generate_todays_reminders(
                    medication_id=med.id,
                    user_id=p.id,
                    dosage_timing=med.dosage_timing or "",
                    duration_days=med.duration_days,
                    db=db,
                    custom_times=med.custom_times
                )
    except Exception as e:
        logger.error(f"Error in generate_midnight_reminders: {e}")
        db.rollback()
    finally:
        db.close()

def check_due_reminders():
    """Runs periodically to check and send due WhatsApp reminders."""
    db = SessionLocal()
    try:
        now = datetime.now()
        lead_minutes = getattr(settings, "WHATSAPP_LEAD_MINUTES", 0)
        
        # Upper bound: we want reminders scheduled up to now + lead_minutes
        # Lower bound: to avoid sending very old ones (e.g. if server was off),
        # only send reminders scheduled within the last 60 minutes + lead_minutes.
        upper_bound = now + timedelta(minutes=lead_minutes)
        lower_bound = now - timedelta(minutes=60) + timedelta(minutes=lead_minutes)
        
        due_reminders = db.query(ReminderLog).filter(
            ReminderLog.status == ReminderStatus.pending,
            ReminderLog.whatsapp_sent == False,
            ReminderLog.scheduled_time <= upper_bound,
            ReminderLog.scheduled_time >= lower_bound
        ).all()
        
        if due_reminders:
            logger.info(f"Found {len(due_reminders)} pending reminders for WhatsApp notification.")
            
        for log in due_reminders:
            try:
                # Query user/patient details dynamically
                patient = db.query(User).filter(User.id == log.user_id).first()
                if not patient or not patient.phone:
                    logger.warning(f"Reminder log {log.id}: Patient {log.user_id} has no phone number. Skipping WhatsApp.")
                    continue
                
                med = db.query(Medication).filter(Medication.id == log.medication_id).first()
                med_name = med.name if med else "Unknown Medication"
                
                # Format time string for readability (12-hour format, e.g. 08:00 PM)
                time_str = log.scheduled_time.strftime('%I:%M %p')
                
                # Format template
                template = getattr(
                    settings, 
                    "WHATSAPP_TEMPLATE", 
                    "🏥 WellCare AI Reminder\n\nHi {name} 👋\n\nYour medication is due now.\n\n💊 Medicine: {medicine_name}\n⏰ Time: {time}\n\nPlease take your medicine and mark it as taken inside WellCare.\n\nStay healthy 💙"
                )

                
                body = template.format(
                    name=patient.name,
                    medicine_name=med_name,
                    time=time_str
                )
                
                success = send_whatsapp_message(to_phone=patient.phone, body=body)
                if success:
                    log.whatsapp_sent = True
                    log.whatsapp_sent_at = datetime.now()
            except Exception as inner_e:
                logger.error(f"Error processing WhatsApp reminder for log {log.id}: {inner_e}")
                
        db.commit()
    except Exception as e:
        logger.error(f"Error in check_due_reminders: {e}")
        db.rollback()
    finally:
        db.close()


def check_due_ai_calls():
    """Runs periodically to trigger Vapi AI calls for ignored WhatsApp reminders."""
    db = SessionLocal()
    try:
        now = datetime.now()
        delay_minutes = getattr(settings, "AI_CALL_DELAY_MINUTES", 15)
        
        # We only want to process reminders where WhatsApp was sent at least delay_minutes ago
        cutoff_time = now - timedelta(minutes=delay_minutes)
        
        due_ai_calls = db.query(ReminderLog).filter(
            ReminderLog.status == ReminderStatus.pending,
            ReminderLog.whatsapp_sent == True,
            ReminderLog.ai_call_sent == False,
            ReminderLog.whatsapp_sent_at.isnot(None),
            ReminderLog.whatsapp_sent_at <= cutoff_time
        ).all()

        if due_ai_calls:
            logger.info(f"Found {len(due_ai_calls)} pending reminders for Vapi AI call fallback.")

        for log in due_ai_calls:
            try:
                patient = db.query(User).filter(User.id == log.user_id).first()
                if not patient or not patient.phone:
                    logger.warning(f"Reminder log {log.id}: Patient {log.user_id} has no phone. Skipping AI call.")
                    continue
                
                med = db.query(Medication).filter(Medication.id == log.medication_id).first()
                med_name = med.name if med else "Unknown Medication"
                
                success = trigger_vapi_call(
                    patient_name=patient.name,
                    phone_number=patient.phone,
                    medication_name=med_name
                )
                
                if success:
                    log.ai_call_sent = True
                    log.ai_call_sent_at = datetime.now()
            except Exception as inner_e:
                logger.error(f"Error processing AI call for log {log.id}: {inner_e}")

        db.commit()
    except Exception as e:
        logger.error(f"Error in check_due_ai_calls: {e}")
        db.rollback()
    finally:
        db.close()


def start_scheduler():
    scheduler.add_job(
        detect_missed_doses,
        trigger=IntervalTrigger(minutes=10),
        id="detect_missed_doses_job",
        name="Detect missed doses every 10 minutes",
        replace_existing=True,
    )
    
    scheduler.add_job(
        generate_midnight_reminders,
        trigger=CronTrigger(hour=0, minute=5),
        id="generate_midnight_reminders_job",
        name="Generate daily reminders at 12:05 AM",
        replace_existing=True,
    )

    scheduler.add_job(
        check_due_reminders,
        trigger=IntervalTrigger(minutes=1),
        id="check_due_reminders_job",
        name="Check and send due WhatsApp reminders every 1 minute",
        replace_existing=True,
    )
    
    scheduler.add_job(
        check_due_ai_calls,
        trigger=IntervalTrigger(minutes=1),
        id="check_due_ai_calls_job",
        name="Check and trigger due Vapi AI calls every 1 minute",
        replace_existing=True,
    )

    if not scheduler.running:
        scheduler.start()

def stop_scheduler():
    if scheduler.running:
        scheduler.shutdown()

