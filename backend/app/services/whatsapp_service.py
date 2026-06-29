import logging
from twilio.rest import Client
from app.core.config import settings

logger = logging.getLogger(__name__)

def send_whatsapp_message(to_phone: str, body: str) -> bool:
    """
    Sends a WhatsApp message via Twilio.
    Returns True if successful, False otherwise.
    
    If Twilio credentials are not set and settings.DEBUG is True,
    it simulates the send and prints the message to the console.
    """
    account_sid = settings.TWILIO_ACCOUNT_SID
    auth_token = settings.TWILIO_AUTH_TOKEN
    from_number = settings.TWILIO_WHATSAPP_NUMBER
    
    if not account_sid or not auth_token or not from_number:
        logger.warning(
            "Twilio credentials not configured (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_NUMBER). "
            "Simulating send to %s", to_phone
        )
        if settings.DEBUG:
            print(f"\n--- [MOCK WHATSAPP SEND] ---")
            print(f"To: {to_phone}")
            print(f"Body:\n{body}")
            print(f"-----------------------------\n")
            return True
        return False
        
    try:
        # Normalize recipient number: Twilio requires whatsapp:+E164 format
        to_number = to_phone.strip()
        if not to_number.startswith("whatsapp:"):
            to_number = f"whatsapp:{to_number}"
            
        # Normalize sender number
        sender_number = from_number.strip()
        if not sender_number.startswith("whatsapp:"):
            sender_number = f"whatsapp:{sender_number}"
            
        client = Client(account_sid, auth_token)
        message = client.messages.create(
            from_=sender_number,
            body=body,
            to=to_number
        )
        logger.info(f"Successfully sent WhatsApp message to {to_phone}. Message SID: {message.sid}")
        return True
    except Exception as e:
        logger.error(f"Error sending WhatsApp message to {to_phone} via Twilio: {e}")
        return False
