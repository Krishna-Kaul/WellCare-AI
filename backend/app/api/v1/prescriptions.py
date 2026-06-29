import os
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.database import get_db
from app.api.deps import require_role
from app.models.user import User, UserRole
from app.models.prescription import Prescription, PrescriptionStatus
from app.models.medication import Medication
from app.services.ocr_service import extract_medicines_from_image
from app.services.reminder_generator import generate_todays_reminders

router = APIRouter()

UPLOAD_DIR = "uploads/prescriptions"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/upload")
async def upload_prescription(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.patient, UserRole.admin))
):
    allowed = ["image/jpeg", "image/png", "image/jpg"]
    if file.content_type not in allowed:
        raise HTTPException(status_code=400, detail="Only JPG, PNG allowed")

    file_path = f"{UPLOAD_DIR}/{current_user.id}_{file.filename}"
    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)

    prescription = Prescription(
        user_id   = current_user.id,
        file_path = file_path,
        status    = PrescriptionStatus.processing
    )
    db.add(prescription)
    db.commit()
    db.refresh(prescription)

    extracted = extract_medicines_from_image(file_path)

    if not extracted:
        prescription.status = PrescriptionStatus.failed
        db.commit()
        raise HTTPException(
            status_code=422,
            detail="Could not extract medicines from image"
        )

    prescription.status = PrescriptionStatus.completed
    db.commit()

    return {
        "prescription_id":     prescription.id,
        "extracted_medicines": extracted,
        "message":             "Please confirm the extracted medicines"
    }

class ConfirmRequest(BaseModel):
    prescription_id: int
    medicines: list[dict]

@router.post("/confirm")
def confirm_prescription(
    request: ConfirmRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.patient, UserRole.admin))
):
    prescription = db.query(Prescription).filter(
        Prescription.id      == request.prescription_id,
        Prescription.user_id == current_user.id
    ).first()

    if not prescription:
        raise HTTPException(status_code=404, detail="Prescription not found")

    saved = []
    for med in request.medicines:
        new_med = Medication(
            user_id       = current_user.id,
            name          = med.get("name", "Unknown"),
            strength      = med.get("strength"),
            dosage_timing = med.get("dosage_timing"),
            duration_days = med.get("duration_days"),
            before_meal   = med.get("before_meal", False),
            notes         = med.get("notes"),
            source        = "ocr"
        )
        db.add(new_med)
        db.flush()

        generate_todays_reminders(
            medication_id = new_med.id,
            user_id       = current_user.id,
            dosage_timing = new_med.dosage_timing or "",
            duration_days = new_med.duration_days,
            db            = db,
            custom_times  = new_med.custom_times,
        )
        saved.append(new_med)

    db.commit()

    return {
        "message":     f"{len(saved)} medicines saved successfully",
        "saved_count": len(saved)
    }

@router.get("/")
def get_my_prescriptions(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.patient, UserRole.admin))
):
    return db.query(Prescription).filter(
        Prescription.user_id == current_user.id
    ).order_by(Prescription.created_at.desc()).all()