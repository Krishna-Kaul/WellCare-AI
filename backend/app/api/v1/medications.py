from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import date, datetime

from app.core.database import get_db
from app.api.deps import get_current_user, require_role
from app.models.user import User, UserRole
from app.models.medication import Medication
from app.models.reminder import ReminderLog, ReminderStatus
from app.schemas.medication import MedicationCreate, MedicationUpdate, MedicationResponse
from app.services.reminder_generator import generate_todays_reminders

router = APIRouter()

@router.get("/", response_model=list[MedicationResponse])
def get_my_medications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(Medication).filter(
        Medication.user_id   == current_user.id,
        Medication.is_active == True
    ).all()

@router.post("/", response_model=MedicationResponse, status_code=201)
def add_medication(
    med_data: MedicationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.patient, UserRole.admin))
):
    new_med = Medication(
        user_id       = current_user.id,
        name          = med_data.name,
        strength      = med_data.strength,
        dosage_timing = med_data.dosage_timing,
        duration_days = med_data.duration_days,
        before_meal   = med_data.before_meal,
        notes         = med_data.notes,
        custom_times  = med_data.custom_times,
        source        = "manual"
    )
    db.add(new_med)
    db.commit()
    db.refresh(new_med)

    generate_todays_reminders(
        medication_id = new_med.id,
        user_id       = current_user.id,
        dosage_timing = new_med.dosage_timing or "",
        duration_days = new_med.duration_days,
        db            = db,
        custom_times  = new_med.custom_times,
    )

    return new_med

@router.put("/{medication_id}", response_model=MedicationResponse)
def update_medication(
    medication_id: int,
    update_data: MedicationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.patient, UserRole.admin))
):
    med = db.query(Medication).filter(
        Medication.id      == medication_id,
        Medication.user_id == current_user.id
    ).first()

    if not med:
        raise HTTPException(status_code=404, detail="Medication not found")

    for field, value in update_data.model_dump(exclude_none=True).items():
        setattr(med, field, value)

    db.commit()
    db.refresh(med)

    # Regenerate reminders with updated timing
    today_start = datetime.combine(date.today(), datetime.min.time())
    db.query(ReminderLog).filter(
        ReminderLog.medication_id == med.id,
        ReminderLog.user_id == current_user.id,
        ReminderLog.status == ReminderStatus.pending,
        ReminderLog.scheduled_time >= today_start
    ).delete()
    db.commit()

    generate_todays_reminders(
        medication_id = med.id,
        user_id       = current_user.id,
        dosage_timing = med.dosage_timing or "",
        duration_days = med.duration_days,
        db            = db,
        custom_times  = med.custom_times,
    )

    return med

@router.delete("/{medication_id}", status_code=204)
def delete_medication(
    medication_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.patient, UserRole.admin))
):
    med = db.query(Medication).filter(
        Medication.id      == medication_id,
        Medication.user_id == current_user.id
    ).first()

    if not med:
        raise HTTPException(status_code=404, detail="Medication not found")

    med.is_active = False

    # Remove pending future reminders since med is deleted
    today_start = datetime.combine(date.today(), datetime.min.time())
    db.query(ReminderLog).filter(
        ReminderLog.medication_id == med.id,
        ReminderLog.user_id == current_user.id,
        ReminderLog.status == ReminderStatus.pending,
        ReminderLog.scheduled_time >= today_start
    ).delete()

    db.commit()