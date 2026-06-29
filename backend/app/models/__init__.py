# Saare models yahan import karo taaki Base.metadata.create_all() sab tables dekh sake
from app.models.user import User
from app.models.medication import Medication
from app.models.reminder import ReminderLog
from app.models.prescription import Prescription
from app.models.doctor_patient import DoctorPatient
from app.models.missed_dose_alert import MissedDoseAlert
