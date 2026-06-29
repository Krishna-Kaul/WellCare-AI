from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    APP_NAME: str = "WellCare AI"
    DEBUG: bool = False

    DB_HOST: str
    # DB_PORT: int = 3306
    DB_PORT: int = 5432
    DB_USER: str
    DB_PASSWORD: str
    DB_NAME: str

    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    GROQ_API_KEY_OCR: str
    GROQ_API_KEY_VOICE: str

    # Twilio / WhatsApp configs
    TWILIO_ACCOUNT_SID: str | None = None
    TWILIO_AUTH_TOKEN: str | None = None
    TWILIO_WHATSAPP_NUMBER: str | None = None
    WHATSAPP_LEAD_MINUTES: int = 0
    WHATSAPP_TEMPLATE: str = "🏥 WellCare AI Reminder\n\nHi {name} 👋\n\nYour medication is due now.\n\n💊 Medicine: {medicine_name}\n⏰ Time: {time}\n\nPlease take your medicine and mark it as taken inside WellCare.\n\nStay healthy 💙"

    # Vapi configs
    VAPI_API_KEY: str | None = None
    VAPI_ASSISTANT_ID: str | None = None
    VAPI_PHONE_NUMBER_ID: str | None = None
    AI_CALL_DELAY_MINUTES: int = 3

    class Config:
        env_file = ".env"

settings = Settings()
