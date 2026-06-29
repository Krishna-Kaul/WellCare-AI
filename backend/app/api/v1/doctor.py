from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, date, timedelta

from app.core.database import get_db
from app.api.deps import get_current_doctor
from app.models.user import User, UserRole
from app.models.reminder import ReminderLog, ReminderStatus
from app.models.doctor_patient import DoctorPatient, RelationshipType
from app.models.medication import Medication
from app.models.missed_dose_alert import MissedDoseAlert
from app.services.behavior_analyzer import compute_features
from app.services.ml_predictor import predict as ml_predict

router = APIRouter()


@router.get("/patients")
def get_my_patients(
    db: Session = Depends(get_db),
    current_doctor: User = Depends(get_current_doctor)
):
    links = db.query(DoctorPatient).filter(
        DoctorPatient.doctor_id         == current_doctor.id,
        DoctorPatient.relationship_type == RelationshipType.doctor
    ).all()

    patient_ids = [link.patient_id for link in links]
    patients    = db.query(User).filter(User.id.in_(patient_ids)).all()

    result = []
    for patient in patients:
        today = date.today()
        logs = db.query(ReminderLog).filter(
            ReminderLog.user_id        == patient.id,
            ReminderLog.scheduled_time >= datetime.combine(today, datetime.min.time()),
            ReminderLog.scheduled_time <= datetime.combine(today, datetime.max.time())
        ).all()

        total         = len(logs)
        taken         = sum(1 for l in logs if l.status == ReminderStatus.taken)
        adherence_pct = round((taken / total * 100) if total > 0 else 0)

        result.append({
            "id":        patient.id,
            "name":      patient.name,
            "email":     patient.email,
            "adherence": adherence_pct,
            "at_risk":   adherence_pct < 70
        })

    return result


@router.get("/dashboard")
def get_doctor_dashboard(
    db: Session = Depends(get_db),
    current_doctor: User = Depends(get_current_doctor)
):
    links = db.query(DoctorPatient).filter(
        DoctorPatient.doctor_id         == current_doctor.id,
        DoctorPatient.relationship_type == RelationshipType.doctor
    ).all()

    patient_ids = [link.patient_id for link in links]
    patients    = db.query(User).filter(User.id.in_(patient_ids)).all()

    today = date.today()

    patients_data = []
    at_risk_count = 0

    for patient in patients:
        logs = db.query(ReminderLog).filter(
            ReminderLog.user_id        == patient.id,
            ReminderLog.scheduled_time >= datetime.combine(today, datetime.min.time()),
            ReminderLog.scheduled_time <= datetime.combine(today, datetime.max.time())
        ).all()

        total         = len(logs)
        taken         = sum(1 for l in logs if l.status == ReminderStatus.taken)
        adherence_pct = round((taken / total * 100) if total > 0 else 0)
        at_risk       = adherence_pct < 70

        if at_risk:
            at_risk_count += 1

        patients_data.append({
            "id":        patient.id,
            "name":      patient.name,
            "email":     patient.email,
            "adherence": adherence_pct,
            "at_risk":   at_risk
        })

    alerts = []
    for patient in patients_data:
        if patient["at_risk"]:
            alerts.append({
                "patient_id":    patient["id"],
                "patient_name":  patient["name"],
                "patient_email": patient["email"],
                "message":       f"Adherence is {patient['adherence']}% — high risk",
                "severity":      "high",
                "risk_level":    "high",
            })
        elif patient["adherence"] < 80:
            alerts.append({
                "patient_id":    patient["id"],
                "patient_name":  patient["name"],
                "patient_email": patient["email"],
                "message":       f"Adherence is {patient['adherence']}% — medium risk",
                "severity":      "medium",
                "risk_level":    "medium",
            })

    overall_avg = round(
        sum(p["adherence"] for p in patients_data) / len(patients_data)
    ) if patients_data else 0

    return {
        "doctor": {
            "id":   current_doctor.id,
            "name": current_doctor.name,
        },
        "summary": {
            "total_patients":    len(patients),
            "at_risk_patients":  at_risk_count,
            "safe_patients":     len(patients) - at_risk_count,
            "overall_adherence": overall_avg,
            "active_alerts":     len(alerts),
        },
        "patients": sorted(patients_data, key=lambda x: x["adherence"]),
        "alerts":   sorted(alerts, key=lambda x: x.get("consecutive_missed", 0), reverse=True),
    }


@router.get("/patients/{patient_id}/medications")
def get_patient_medications(
    patient_id: int,
    db: Session = Depends(get_db),
    current_doctor: User = Depends(get_current_doctor)
):
    link = db.query(DoctorPatient).filter(
        DoctorPatient.doctor_id         == current_doctor.id,
        DoctorPatient.patient_id        == patient_id,
        DoctorPatient.relationship_type == RelationshipType.doctor
    ).first()

    if not link:
        raise HTTPException(status_code=403, detail="Ye patient aapke saath linked nahi hai")

    medicines = db.query(Medication).filter(
        Medication.user_id   == patient_id,
        Medication.is_active == True
    ).all()

    return medicines


@router.get("/patients/{patient_id}/reminders")
def get_patient_reminders(
    patient_id: int,
    db: Session = Depends(get_db),
    current_doctor: User = Depends(get_current_doctor)
):
    link = db.query(DoctorPatient).filter(
        DoctorPatient.doctor_id         == current_doctor.id,
        DoctorPatient.patient_id        == patient_id,
        DoctorPatient.relationship_type == RelationshipType.doctor
    ).first()

    if not link:
        raise HTTPException(status_code=403, detail="This patient is not linked to your account")

    today = date.today()
    today_logs = db.query(ReminderLog).join(Medication, ReminderLog.medication_id == Medication.id).filter(
        ReminderLog.user_id        == patient_id,
        ReminderLog.scheduled_time >= datetime.combine(today, datetime.min.time()),
        ReminderLog.scheduled_time <= datetime.combine(today, datetime.max.time()),
        Medication.is_active       == True
    ).order_by(ReminderLog.scheduled_time).all()

    todays_schedule = []
    is_weekend = today.weekday() >= 5
    for log in today_logs:
        med = db.query(Medication).filter(Medication.id == log.medication_id).first()
        slot_time = log.scheduled_time.time()
        try:
            features = compute_features(patient_id, log.medication_id, db, slot_time=slot_time)
            ml_res = ml_predict(features, is_weekend)
            early_by_minutes = ml_res.early_by_minutes
        except Exception:
            early_by_minutes = 0

        todays_schedule.append({
            "id":             log.id,
            "medicine_name":  med.name if med else "Unknown",
            "strength":       med.strength if med else "",
            "scheduled_time": log.scheduled_time.isoformat(),
            "meal_timing":    "before" if (med and med.before_meal) else "after" if (med and med.before_meal is False) else "",
            "status":         log.status.value if hasattr(log.status, 'value') else log.status,
            "is_adaptive":    early_by_minutes > 0,
            "early_by_minutes": early_by_minutes,
            "snooze_count":   log.snooze_count,
        })

    return todays_schedule


@router.get("/patients/{patient_id}/adherence")
def get_patient_adherence(
    patient_id: int,
    db: Session = Depends(get_db),
    current_doctor: User = Depends(get_current_doctor)
):
    link = db.query(DoctorPatient).filter(
        DoctorPatient.doctor_id         == current_doctor.id,
        DoctorPatient.patient_id        == patient_id,
        DoctorPatient.relationship_type == RelationshipType.doctor
    ).first()

    if not link:
        raise HTTPException(status_code=403, detail="Ye patient aapke saath linked nahi hai")

    today  = date.today()

    today_logs = db.query(ReminderLog).filter(
        ReminderLog.user_id        == patient_id,
        ReminderLog.scheduled_time >= datetime.combine(today, datetime.min.time()),
        ReminderLog.scheduled_time <= datetime.combine(today, datetime.max.time())
    ).all()

    today_total = len(today_logs)
    today_taken = sum(1 for l in today_logs if l.status == ReminderStatus.taken)
    today_pct   = round((today_taken / today_total * 100) if today_total > 0 else 0)

    weekly = []
    for i in range(6, -1, -1):
        day      = today - timedelta(days=i)
        day_logs = db.query(ReminderLog).filter(
            ReminderLog.user_id        == patient_id,
            ReminderLog.scheduled_time >= datetime.combine(day, datetime.min.time()),
            ReminderLog.scheduled_time <= datetime.combine(day, datetime.max.time())
        ).all()

        total = len(day_logs)
        taken = sum(1 for l in day_logs if l.status == ReminderStatus.taken)
        pct   = round((taken / total * 100) if total > 0 else 0)

        weekly.append({
            "date":      day.isoformat(),
            "day":       day.strftime("%a"),
            "adherence": pct,
            "total":     total,
            "taken":     taken
        })

    return {
        "patient_id":       patient_id,
        "today_adherence":  today_pct,
        "weekly_breakdown": weekly,
        "weekly_average":   round(sum(d["adherence"] for d in weekly) / 7)
    }


@router.get("/patients/{patient_id}/export")
def export_patient_report(
    patient_id: int,
    format: str = "csv",
    db: Session = Depends(get_db),
    current_doctor: User = Depends(get_current_doctor)
):
    import io
    import csv
    from fastapi.responses import StreamingResponse

    link = db.query(DoctorPatient).filter(
        DoctorPatient.doctor_id         == current_doctor.id,
        DoctorPatient.patient_id        == patient_id,
        DoctorPatient.relationship_type == RelationshipType.doctor
    ).first()

    if not link:
        raise HTTPException(status_code=403, detail="Ye patient aapke saath linked nahi hai")

    patient = db.query(User).filter(User.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    thirty_days_ago = datetime.combine(
        date.today() - timedelta(days=30), datetime.min.time()
    )

    logs = db.query(ReminderLog).filter(
        ReminderLog.user_id        == patient_id,
        ReminderLog.scheduled_time >= thirty_days_ago
    ).order_by(ReminderLog.scheduled_time.asc()).all()

    medicines = db.query(Medication).filter(
        Medication.user_id   == patient_id,
        Medication.is_active == True
    ).all()

    if format == "csv":
        output = io.StringIO()
        writer = csv.writer(output)

        writer.writerow(["WellCare AI — Patient Adherence Report"])
        writer.writerow(["Patient Name", patient.name])
        writer.writerow(["Patient Email", patient.email])
        writer.writerow(["Doctor", current_doctor.name])
        writer.writerow(["Report Date", date.today().isoformat()])
        writer.writerow(["Period", "Last 30 days"])
        writer.writerow([])

        writer.writerow(["Active Medicines"])
        writer.writerow(["Name", "Strength", "Dosage Timing", "Before Meal"])
        for med in medicines:
            writer.writerow([
                med.name,
                med.strength or "N/A",
                med.dosage_timing or "N/A",
                "Yes" if med.before_meal else "No"
            ])
        writer.writerow([])

        total         = len(logs)
        taken         = sum(1 for l in logs if l.status == ReminderStatus.taken)
        missed        = sum(1 for l in logs if l.status == ReminderStatus.missed)
        adherence_pct = round((taken / total * 100) if total > 0 else 0)

        writer.writerow(["Adherence Summary"])
        writer.writerow(["Total Doses", total])
        writer.writerow(["Taken", taken])
        writer.writerow(["Missed", missed])
        writer.writerow(["Adherence %", f"{adherence_pct}%"])
        writer.writerow([])

        writer.writerow(["Dose Log"])
        writer.writerow(["Date", "Scheduled Time", "Medication ID", "Status", "Action Time"])
        for log in logs:
            writer.writerow([
                log.scheduled_time.date().isoformat(),
                log.scheduled_time.strftime("%H:%M"),
                log.medication_id,
                log.status.value,
                log.action_time.strftime("%H:%M") if log.action_time else "N/A"
            ])

        output.seek(0)
        filename = f"wellcare_{patient.name.replace(' ', '_')}_report.csv"
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )

    elif format == "pdf":
        from reportlab.lib.pagesizes import A4
        from reportlab.lib import colors
        from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
        from reportlab.lib.styles import getSampleStyleSheet
        from reportlab.lib.units import mm

        buffer   = io.BytesIO()
        doc      = SimpleDocTemplate(buffer, pagesize=A4)
        styles   = getSampleStyleSheet()
        elements = []

        elements.append(Paragraph("WellCare AI — Patient Adherence Report", styles["Title"]))
        elements.append(Spacer(1, 10 * mm))

        info_data = [
            ["Patient Name",  patient.name],
            ["Patient Email", patient.email],
            ["Doctor",        current_doctor.name],
            ["Report Date",   date.today().isoformat()],
            ["Period",        "Last 30 days"],
        ]
        info_table = Table(info_data, colWidths=[60 * mm, 100 * mm])
        info_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (0, -1), colors.lightblue),
            ("FONTNAME",   (0, 0), (0, -1), "Helvetica-Bold"),
            ("GRID",       (0, 0), (-1, -1), 0.5, colors.grey),
            ("PADDING",    (0, 0), (-1, -1), 6),
        ]))
        elements.append(info_table)
        elements.append(Spacer(1, 8 * mm))

        total         = len(logs)
        taken         = sum(1 for l in logs if l.status == ReminderStatus.taken)
        missed        = sum(1 for l in logs if l.status == ReminderStatus.missed)
        adherence_pct = round((taken / total * 100) if total > 0 else 0)

        elements.append(Paragraph("Adherence Summary", styles["Heading2"]))
        summary_data = [
            ["Total Doses", "Taken", "Missed", "Adherence %"],
            [str(total), str(taken), str(missed), f"{adherence_pct}%"],
        ]
        summary_table = Table(summary_data, colWidths=[40 * mm, 40 * mm, 40 * mm, 40 * mm])
        summary_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#2563EB")),
            ("TEXTCOLOR",  (0, 0), (-1, 0), colors.white),
            ("FONTNAME",   (0, 0), (-1, 0), "Helvetica-Bold"),
            ("ALIGN",      (0, 0), (-1, -1), "CENTER"),
            ("GRID",       (0, 0), (-1, -1), 0.5, colors.grey),
            ("PADDING",    (0, 0), (-1, -1), 6),
            ("BACKGROUND", (0, 1), (-1, 1), colors.HexColor("#F4F9F9")),
        ]))
        elements.append(summary_table)
        elements.append(Spacer(1, 8 * mm))

        elements.append(Paragraph("Active Medicines", styles["Heading2"]))
        med_data = [["Medicine", "Strength", "Timing", "Before Meal"]]
        for med in medicines:
            med_data.append([
                med.name,
                med.strength or "N/A",
                med.dosage_timing or "N/A",
                "Yes" if med.before_meal else "No"
            ])
        med_table = Table(med_data, colWidths=[50*mm, 35*mm, 50*mm, 30*mm])
        med_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#2563EB")),
            ("TEXTCOLOR",  (0, 0), (-1, 0), colors.white),
            ("FONTNAME",   (0, 0), (-1, 0), "Helvetica-Bold"),
            ("GRID",       (0, 0), (-1, -1), 0.5, colors.grey),
            ("PADDING",    (0, 0), (-1, -1), 6),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F4F9F9")]),
        ]))
        elements.append(med_table)

        doc.build(elements)
        buffer.seek(0)

        filename = f"wellcare_{patient.name.replace(' ', '_')}_report.pdf"
        return StreamingResponse(
            buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )

    else:
        raise HTTPException(status_code=400, detail="Invalid format. Use 'csv' or 'pdf'")


@router.get("/alerts")
def get_high_risk_alerts(
    db: Session = Depends(get_db),
    current_doctor: User = Depends(get_current_doctor)
):
    links = db.query(DoctorPatient).filter(
        DoctorPatient.doctor_id         == current_doctor.id,
        DoctorPatient.relationship_type == RelationshipType.doctor
    ).all()

    patient_ids    = [link.patient_id for link in links]
    seven_days_ago = datetime.combine(
        date.today() - timedelta(days=7), datetime.min.time()
    )

    alerts = []
    for pid in patient_ids:
        patient = db.query(User).filter(User.id == pid).first()

        logs = db.query(ReminderLog).filter(
            ReminderLog.user_id        == pid,
            ReminderLog.scheduled_time >= seven_days_ago
        ).order_by(ReminderLog.scheduled_time.desc()).all()

        consecutive_missed = 0
        for log in logs:
            if log.status == ReminderStatus.missed:
                consecutive_missed += 1
            else:
                break

        total_missed = sum(1 for l in logs if l.status == ReminderStatus.missed)
        total        = len(logs)
        adherence    = round(((total - total_missed) / total * 100) if total > 0 else 0)

        unreads = db.query(MissedDoseAlert).filter(
            MissedDoseAlert.recipient_id == current_doctor.id,
            MissedDoseAlert.patient_id == pid,
            MissedDoseAlert.is_read == False
        ).count()

        if consecutive_missed >= 3 or unreads > 0:
            alerts.append({
                "patient_id":         pid,
                "patient_name":       patient.name,
                "patient_email":      patient.email,
                "message":            f"Missed {consecutive_missed} consecutive doses in last 7 days",
                "consecutive_missed": consecutive_missed,
                "missed_doses":       total_missed,
                "unread_alerts":      unreads,
                "adherence_7days":    adherence,
                "risk_level":         "high" if consecutive_missed >= 5 else "medium",
                "severity":           "high" if consecutive_missed >= 5 else "medium",
                "action_needed":      "Immediate contact required" if consecutive_missed >= 5 else "Follow up recommended"
            })

    return {
        "total_alerts": len(alerts),
        "alerts": sorted(alerts, key=lambda x: x["consecutive_missed"], reverse=True)
    }


@router.post("/patients/{patient_id}/link")
def link_patient(
    patient_id: int,
    db: Session = Depends(get_db),
    current_doctor: User = Depends(get_current_doctor)
):
    patient = db.query(User).filter(
        User.id   == patient_id,
        User.role == UserRole.patient
    ).first()

    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    existing = db.query(DoctorPatient).filter(
        DoctorPatient.doctor_id  == current_doctor.id,
        DoctorPatient.patient_id == patient_id
    ).first()

    if existing:
        raise HTTPException(status_code=409, detail="Patient already linked")

    link = DoctorPatient(
        doctor_id         = current_doctor.id,
        patient_id        = patient_id,
        relationship_type = RelationshipType.doctor
    )
    db.add(link)
    db.commit()

    return {"message": f"Patient {patient.name} linked successfully"}


@router.delete("/patients/{patient_id}/unlink", status_code=204)
def unlink_patient(
    patient_id: int,
    db: Session = Depends(get_db),
    current_doctor: User = Depends(get_current_doctor)
):
    link = db.query(DoctorPatient).filter(
        DoctorPatient.doctor_id  == current_doctor.id,
        DoctorPatient.patient_id == patient_id
    ).first()

    if not link:
        raise HTTPException(status_code=404, detail="Link not found")

    db.delete(link)
    db.commit()