import io
import httpx
from datetime import datetime, date
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.medication import Medication
from app.models.reminder import ReminderLog, ReminderStatus

GROQ_BASE = "https://api.groq.com/openai/v1"


async def transcribe_audio(audio_bytes: bytes, filename: str = "audio.webm") -> str:
    """
    Patient ki voice recording ko text me convert karta hai.
    Groq ka Whisper-large-v3 model use hota hai — Hindi + English dono support karta hai.

    Args:
        audio_bytes: Frontend se aaya raw audio (webm/wav/mp3)
        filename:    File ka naam — Groq ko format samajhne me help karta hai

    Returns:
        Transcribed text string
        Example: "aaj mujhe kaunsi dawai leni hai"
    """
    if not settings.GROQ_API_KEY_VOICE:
        raise ValueError("GROQ_API_KEY_VOICE .env me set nahi hai")

    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post(
            f"{GROQ_BASE}/audio/transcriptions",
            headers={"Authorization": f"Bearer {settings.GROQ_API_KEY_VOICE}"},
            files={
                "file": (filename, io.BytesIO(audio_bytes), "audio/webm"),
            },
            data={
                "model": "whisper-large-v3",
                "response_format": "text",
                "language": "hi",
            },
        )

    if response.status_code != 200:
        raise RuntimeError(f"Groq STT error {response.status_code}: {response.text}")

    return response.text.strip()


def _get_patient_context(user_id: int, db: Session) -> dict:
    """
    Patient ke active medications aur aaj ke reminder logs fetch karta hai.
    Ye data Groq LLM ko context ke roop me diya jata hai.

    SECURITY: Har query me user_id filter — dusre patient ka data kabhi nahi aata.
    """
    today = date.today()
    today_start = datetime.combine(today, datetime.min.time())
    today_end   = datetime.combine(today, datetime.max.time())

    medications = db.query(Medication).filter(
        Medication.user_id   == user_id,
        Medication.is_active == True
    ).all()

    med_list = [
        {
            "name":          m.name,
            "strength":      m.strength or "not specified",
            "dosage_timing": m.dosage_timing or "not specified",
            "before_meal":   m.before_meal,
            "notes":         m.notes or "",
        }
        for m in medications
    ]

    logs = db.query(ReminderLog).filter(
        ReminderLog.user_id        == user_id,
        ReminderLog.scheduled_time >= today_start,
        ReminderLog.scheduled_time <= today_end,
    ).all()

    log_list = [
        {
            "medication_id":  l.medication_id,
            "scheduled_time": l.scheduled_time.strftime("%I:%M %p"),
            "status":         l.status.value,
        }
        for l in logs
    ]

    total   = len(logs)
    taken   = sum(1 for l in logs if l.status == ReminderStatus.taken)
    missed  = sum(1 for l in logs if l.status == ReminderStatus.missed)
    pending = sum(1 for l in logs if l.status == ReminderStatus.pending)

    return {
        "medications":    med_list,
        "todays_logs":    log_list,
        "summary": {
            "total":   total,
            "taken":   taken,
            "missed":  missed,
            "pending": pending,
        },
        "current_time":   datetime.now().strftime("%I:%M %p"),
        "current_date":   today.strftime("%B %d, %Y"),
    }


async def _generate_llm_response(user_query: str, patient_context: dict) -> str:
    """
    User ke query aur patient ke DB data ko Groq LLaMA ko deta hai.
    LLM natural, helpful, aur concise response generate karta hai.

    Args:
        user_query:       Whisper se aaya transcribed text
        patient_context:  DB se fetch kiya gaya patient data (medications + logs)

    Returns:
        Natural language answer string (TTS ke liye ready)
    """
    if not settings.GROQ_API_KEY_VOICE:
        raise ValueError("GROQ_API_KEY_VOICE .env me set nahi hai")

    system_prompt = """You are WellCare Voice Assistant — a helpful, caring medication reminder assistant for patients.

YOUR ROLE:
- Help patients with their medication schedule and reminders
- Answer questions about THEIR medications only (based on provided data)
- Be warm, simple, and clear — patients may be elderly or unwell

STRICT RULES:
- ONLY use the patient data provided to you — never invent medication names or timings
- DO NOT give medical advice, dosage changes, or side effect information
- If asked something outside your scope, politely redirect
- Keep responses SHORT — 2-3 sentences max (will be spoken aloud via text-to-speech)
- Respond in the SAME language the patient used (Hindi, English, or Hinglish)
- Do NOT use bullet points or markdown — plain conversational text only (it will be read aloud)

SCOPE (what you CAN answer):
- Which medicines to take now / today
- Next reminder timing
- Whether a dose was taken or missed today
- Today's adherence summary
- Timing of a specific medicine (e.g., "When do I take Metformin?")

OUT OF SCOPE (politely decline):
- Side effects, drug interactions
- Dosage changes
- Other patients' data
- Non-medication questions"""

    user_message = f"""Patient's question: "{user_query}"

Patient's medication data (use ONLY this):
- Active medications: {patient_context['medications']}
- Today's reminder logs: {patient_context['todays_logs']}
- Summary: {patient_context['summary']}
- Current time: {patient_context['current_time']}
- Today's date: {patient_context['current_date']}

Please answer the patient's question based on their data above."""

    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post(
            f"{GROQ_BASE}/chat/completions",
            headers={
                "Authorization": f"Bearer {settings.GROQ_API_KEY_VOICE}",
                "Content-Type": "application/json",
            },
            json={
                "model":       "llama-3.3-70b-versatile",
                "max_tokens":  200,
                "temperature": 0.4,
                "messages": [
                    {"role": "system",  "content": system_prompt},
                    {"role": "user",    "content": user_message},
                ],
            },
        )

    if response.status_code != 200:
        raise RuntimeError(f"Groq LLM error {response.status_code}: {response.text}")

    data = response.json()
    return data["choices"][0]["message"]["content"].strip()


async def text_to_speech(text: str) -> bytes:
    """
    LLM ka text response ko audio me convert karta hai.
    Groq ka PlayAI TTS model use hota hai.

    Args:
        text: LLM ka generated response string

    Returns:
        Audio bytes (WAV format) — frontend me <audio> tag se play hoga
    """
    if not settings.GROQ_API_KEY_VOICE:
        raise ValueError("GROQ_API_KEY_VOICE .env me set nahi hai")

    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post(
            f"{GROQ_BASE}/audio/speech",
            headers={
                "Authorization": f"Bearer {settings.GROQ_API_KEY_VOICE}",
                "Content-Type": "application/json",
            },
            json={
                "model":  "canopylabs/orpheus-v1-english",
                "input":  text,
                "voice":  "hannah",
                "response_format": "wav",
            },
        )

    if response.status_code != 200:
        raise RuntimeError(f"Groq TTS error {response.status_code}: {response.text}")

    return response.content


async def handle_voice_query(
    query: str,
    user_id: int,
    db: Session,
) -> str:
    """
    Text query (already transcribed) ka LLM response generate karo.
    voice.py ke /query endpoint ke liye (text-only flow).

    Args:
        query:   Transcribed text ya direct text query
        user_id: JWT se extract kiya gaya patient ID
        db:      SQLAlchemy session

    Returns:
        Natural language response string
    """
    context = _get_patient_context(user_id, db)
    response_text = await _generate_llm_response(query, context)
    return response_text


async def handle_audio_query(
    audio_bytes: bytes,
    user_id: int,
    db: Session,
    filename: str = "audio.webm",
) -> tuple[str, str, bytes]:
    """
    Complete audio pipeline: audio → STT → LLM → TTS → audio response

    Args:
        audio_bytes: Frontend se aaya recorded audio
        user_id:     JWT se extract kiya gaya patient ID
        db:          SQLAlchemy session
        filename:    Audio file name (format detection ke liye)

    Returns:
        Tuple of (transcribed_text, response_text, response_audio_bytes)
    """
    transcribed_text = await transcribe_audio(audio_bytes, filename)
    context          = _get_patient_context(user_id, db)
    response_text    = await _generate_llm_response(transcribed_text, context)
    response_audio   = await text_to_speech(response_text)

    return transcribed_text, response_text, response_audio
