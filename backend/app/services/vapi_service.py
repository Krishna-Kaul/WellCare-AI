import logging
import requests
from app.core.config import settings

logger = logging.getLogger(__name__)

def trigger_vapi_call(patient_name: str, phone_number: str, medication_name: str) -> bool:
    """
    Triggers an outbound Vapi AI call to the patient.
    """
    missing_configs = []
    if not settings.VAPI_API_KEY:
        missing_configs.append("VAPI_API_KEY")
    if not settings.VAPI_ASSISTANT_ID:
        missing_configs.append("VAPI_ASSISTANT_ID")
    if not settings.VAPI_PHONE_NUMBER_ID:
        missing_configs.append("VAPI_PHONE_NUMBER_ID")
        
    if missing_configs:
        logger.error(f"[VAPI] [AI_CALL] Missing Vapi configuration: {', '.join(missing_configs)}. Call aborted.")
        return False

    api_key_prefix = settings.VAPI_API_KEY[:6] if len(settings.VAPI_API_KEY) >= 6 else "***"
    logger.info(f"[VAPI] [AI_CALL] Using API Key starting with: {api_key_prefix}")
    logger.info(f"[VAPI] [AI_CALL] Assistant ID: {settings.VAPI_ASSISTANT_ID}")
    logger.info(f"[VAPI] [AI_CALL] Phone Number ID: {settings.VAPI_PHONE_NUMBER_ID}")

    url = "https://api.vapi.ai/call"
    headers = {
        "Authorization": f"Bearer {settings.VAPI_API_KEY}",
        "Content-Type": "application/json"
    }

    payload = {
        "assistantId": settings.VAPI_ASSISTANT_ID,
        "phoneNumberId": settings.VAPI_PHONE_NUMBER_ID,
        "customer": {
            "number": phone_number
        },
        "assistantOverrides": {
            "variableValues": {
                "patient_name": patient_name,
                "medication_name": medication_name
            }
        }
    }

    logger.info(f"[VAPI] [AI_CALL] Initiating AI call for patient '{patient_name}' to {phone_number}")
    logger.info(f"[VAPI] [AI_CALL] Request URL: {url}")
    logger.info(f"[VAPI] [AI_CALL] Request payload: {payload}")

    try:
        response = requests.post(url, headers=headers, json=payload, timeout=10)
        
        logger.info(f"[VAPI] [AI_CALL] Response Status: {response.status_code}")
        logger.info(f"[VAPI] [AI_CALL] Response Body: {response.text}")
        
        if response.status_code in [200, 201]:
            logger.info("[VAPI] [AI_CALL] Call successfully created.")
            return True
        else:
            logger.error("[VAPI] [AI_CALL] Call failed to create.")
            return False

    except requests.exceptions.RequestException as e:
        logger.error(f"[VAPI] [AI_CALL] Request exception during Vapi call: {e}")
        return False
    except Exception as e:
        logger.error(f"[VAPI] [AI_CALL] Unexpected error during Vapi call: {e}")
        return False
