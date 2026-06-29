import os
print("RUNNING FILE:", __file__)
print("CURRENT DIR:", os.getcwd())

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.exc import OperationalError
from starlette.requests import Request
from starlette.responses import JSONResponse
import traceback

from app.core.database import engine, Base
from app.api.v1 import (
    auth,
    users,
    medications,
    reminders,
    prescriptions,
    adherence,
    doctor,
    caregiver,  
    voice,
    patient,
    ml_predictions,
)
from app.services.scheduler import start_scheduler, stop_scheduler

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    try:
        Base.metadata.create_all(bind=engine)
        from sqlalchemy import text
        try:
            with engine.connect() as conn:
                conn.execute(text("ALTER TABLE medications ADD COLUMN IF NOT EXISTS custom_times VARCHAR(200) NULL"))
                
                try:
                    conn.execute(text("ALTER TABLE reminder_logs ADD COLUMN IF NOT EXISTS whatsapp_sent BOOLEAN DEFAULT FALSE"))
                    conn.execute(text("ALTER TABLE reminder_logs ADD COLUMN IF NOT EXISTS whatsapp_sent_at TIMESTAMP NULL"))
                    conn.execute(text("ALTER TABLE reminder_logs ADD COLUMN IF NOT EXISTS ai_call_sent BOOLEAN DEFAULT FALSE"))
                    conn.execute(text("ALTER TABLE reminder_logs ADD COLUMN IF NOT EXISTS ai_call_sent_at TIMESTAMP NULL"))
                    conn.commit()
                except Exception:
                    # Fallback for SQLite / engines that do not support IF NOT EXISTS in ALTER TABLE
                    try:
                        conn.execute(text("ALTER TABLE reminder_logs ADD COLUMN whatsapp_sent BOOLEAN DEFAULT FALSE"))
                        conn.commit()
                    except Exception:
                        pass
                    try:
                        conn.execute(text("ALTER TABLE reminder_logs ADD COLUMN whatsapp_sent_at TIMESTAMP"))
                        conn.commit()
                    except Exception:
                        pass
                    try:
                        conn.execute(text("ALTER TABLE reminder_logs ADD COLUMN ai_call_sent BOOLEAN DEFAULT FALSE"))
                        conn.commit()
                    except Exception:
                        pass
                    try:
                        conn.execute(text("ALTER TABLE reminder_logs ADD COLUMN ai_call_sent_at TIMESTAMP"))
                        conn.commit()
                    except Exception:
                        pass
        except Exception:
            pass

    except OperationalError as e:
        print(
            "Database connection failed during startup. "
            "Check DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME in .env.\n"
            f"Error: {e}"
        )
    
    start_scheduler()
    yield
    stop_scheduler()
    

app = FastAPI(
    title="WellCare AI API",
    description="Backend API for WellCare AI — medication adherence platform",
    version="1.0.0",
    lifespan=lifespan
)

# Add CORS middleware to allow frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(auth.router,          prefix="/api/v1/auth",          tags=["Auth"])
app.include_router(users.router,         prefix="/api/v1/users",         tags=["Users"])
app.include_router(medications.router,   prefix="/api/v1/medications",   tags=["Medications"])
app.include_router(reminders.router,     prefix="/api/v1/reminders",     tags=["Reminders"])
app.include_router(prescriptions.router, prefix="/api/v1/prescriptions", tags=["Prescriptions"])
app.include_router(adherence.router,     prefix="/api/v1/adherence",     tags=["Adherence"])
app.include_router(doctor.router,        prefix="/api/v1/doctor",        tags=["Doctor"])
app.include_router(caregiver.router,     prefix="/api/v1/caregiver",     tags=["Caregiver"])  
app.include_router(voice.router,         prefix="/api/v1/voice",         tags=["Voice"])
app.include_router(patient.router, prefix="/api/v1/patient", tags=["Patient"])
app.include_router(ml_predictions.router, prefix="/api/v1/ml", tags=["ML Predictions"])

@app.get("/health")
def health_check():
    return {"status": "ok", "app": "WellCare AI"}
