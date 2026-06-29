# WellCare AI

WellCare AI is an intelligent healthcare and medication adherence platform that helps patients, caregivers, and doctors collaborate to ensure medicines are taken on time. By combining AI-powered automation, smart reminders, prescription management, and real-time monitoring, WellCare AI improves treatment adherence and patient care.

---

## About the Application

WellCare AI is designed to simplify medication management while reducing missed doses and improving communication between patients, caregivers, and healthcare professionals. The platform provides a centralized ecosystem where patients can manage prescriptions, receive reminders, and benefit from AI-powered healthcare assistance.

---

## Key Features

### AI Voice Calling Agent

* Automated AI-powered voice calls for medication reminders
* Personalized conversations powered by Vapi AI
* Ensures patients receive reminders even when they miss app notifications

### WhatsApp Smart Notifications

* Automated WhatsApp medication reminders using Twilio
* Low-network friendly communication
* Instant reminder delivery for scheduled medicines

### Patient Dashboard

* View today's medication schedule
* Track medicine adherence
* Monitor upcoming and missed doses
* Personalized health overview

### Caregiver Dashboard

* Monitor patient medication adherence remotely
* Receive updates on missed medications
* Support elderly or dependent patients in real time

### Doctor Dashboard

* Access patient treatment progress
* Review prescriptions and adherence history
* Monitor medication compliance across patients

### Smart Prescription Management

* Upload prescriptions digitally
* AI-assisted prescription parsing
* Faster medicine entry with reduced manual effort

### Medication Reminder System

* Schedule reminders for every medication
* Daily dose tracking
* Missed-dose detection and adherence monitoring

### AI Healthcare Assistance

* AI-powered health support and medication guidance
* Intelligent user assistance for healthcare workflows

---

## Tech Stack

### Backend

* Python
* FastAPI
* SQLAlchemy
* PostgreSQL
* JWT Authentication
* APScheduler

### Frontend

* React
* TypeScript
* Vite
* Tailwind CSS

### Integrations

* Groq AI
* Twilio
* Vapi

---

## Prerequisites

Before starting, make sure you have installed:

* Git
* Python 3.11+
* Node.js 18+
* PostgreSQL

---

## Clone the Repository

```bash
git clone <your-repository-url>
cd WellCare-AI
```

---

# Backend Setup

### 1. Navigate to the backend

```bash
cd backend
```

### 2. Create a virtual environment

Windows

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
```

macOS / Linux

```bash
python3 -m venv .venv
source .venv/bin/activate
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Create PostgreSQL Database

```sql
WellCare-DB
```

### 5. Create `.env`

```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=WellCare-DB

SECRET_KEY=your-super-secret-key-change-this-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60

GROQ_API_KEY_OCR=your_groq_ocr_key
GROQ_API_KEY_VOICE=your_groq_voice_key

DEBUG=True

TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_WHATSAPP_NUMBER=your_twilio_whatsapp_number

WHATSAPP_LEAD_MINUTES=0

VAPI_API_KEY=your_vapi_key
VAPI_ASSISTANT_ID=your_vapi_assistant_id
VAPI_PHONE_NUMBER_ID=your_vapi_phone_number_id

AI_CALL_DELAY_MINUTES=3
```

### 6. Run Backend

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Backend API

```text
http://localhost:8000
```

Swagger Documentation

```text
http://localhost:8000/docs
```

---

# Frontend Setup

Navigate to the frontend folder.

```bash
cd ../frontend
```

### Install dependencies

```bash
npm install
```

### Create `.env`

```env
VITE_API_URL=http://localhost:8000
```

### Start the application

```bash
npm run dev
```

Frontend

```text
http://localhost:5173
```

---

# Running the Application

After starting both services:

* Frontend → http://localhost:5173
* Backend API → http://localhost:8000
* Swagger Documentation → http://localhost:8000/docs

---

# Project Structure

```text
WellCare-AI/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── core/
│   │   ├── models/
│   │   ├── schemas/
│   │   └── services/
│   ├── main.py
│   └── tests/
│
└── frontend/
    ├── src/
    ├── public/
    ├── components/
    ├── pages/
    └── package.json
```

---

# Notes

* AI Voice Calling requires valid Vapi credentials.
* WhatsApp notifications require a configured Twilio account.
* AI-powered features require valid Groq API keys.
* Update `VITE_API_URL` when using a hosted backend.
* PostgreSQL must be running before starting the backend.