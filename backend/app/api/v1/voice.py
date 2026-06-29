import base64
from fastapi import APIRouter, Depends, File, UploadFile, HTTPException
from fastapi.responses import Response
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User, UserRole
from app.services.ai_service import handle_audio_query, handle_voice_query

router = APIRouter()


@router.post("/audio")
async def voice_audio_query(
    audio: UploadFile = File(..., description="Patient's recorded audio (webm/wav/mp3)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
Complete voice assistant pipeline:

1. Patient's audio is received (webm — from MediaRecorder)
2. Groq Whisper → converts audio to text (STT)
3. Fetch patient's medication/reminder data from the database
4. Groq LLaMA → generates a natural language response
5. Groq PlayAI → converts response into audio (WAV)
6. Frontend receives both audio and transcript

Security:
- Patient is identified using JWT token (current_user.id)
- Database queries are performed only for that specific patient
- One patient can never access another patient's data
"""
    if current_user.role != UserRole.patient:
        raise HTTPException(
            status_code=403,
            detail="Voice assistant is available only for patients"
        )

    MAX_SIZE = 10 * 1024 * 1024
    audio_bytes = await audio.read()
    if len(audio_bytes) > MAX_SIZE:
        raise HTTPException(status_code=413, detail="Audio file too large (max 10MB)")

    if len(audio_bytes) == 0:
        raise HTTPException(status_code=400, detail="Audio file is empty")

    try:
        transcribed_text, response_text, response_audio = await handle_audio_query(
            audio_bytes = audio_bytes,
            user_id     = current_user.id,
            db          = db,
            filename    = audio.filename or "audio.webm",
        )
    except ValueError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=f"AI service error: {str(e)}")

    audio_b64 = base64.b64encode(response_audio).decode("utf-8")

    return {
        "transcribed_query": transcribed_text,
        "response_text":     response_text,
        "response_audio_b64": audio_b64,
        "audio_format":      "wav",
    }


class TextQueryRequest(BaseModel):
    query: str  


@router.post("/query")
async def voice_text_query(
    request: TextQueryRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
Text-only voice assistant — no microphone required.
Used for testing and for browsers that do not support audio.

Flow: text query → DB context → Groq LLM → text response
(No Text To Speech — only text response is returned)
"""
    if current_user.role != UserRole.patient:
        raise HTTPException(
            status_code=403,
            detail="Voice assistant is available only for patients"
        )

    if not request.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")

    try:
        response_text = await handle_voice_query(
            query   = request.query,
            user_id = current_user.id,
            db      = db,
        )
    except ValueError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=f"AI service error: {str(e)}")

    return {
        "query":    request.query,
        "response": response_text,
    }
