import json
import pytesseract
from PIL import Image
from groq import Groq
from app.core.config import settings

pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

client = Groq(api_key=settings.GROQ_API_KEY_OCR)

def extract_medicines_from_image(file_path: str) -> list[dict]:
    try:
        image    = Image.open(file_path)
        raw_text = pytesseract.image_to_string(image)

        print(f"Tesseract Raw Text:\n{raw_text}")

        if not raw_text.strip():
            print("Tesseract: No text found in image")
            return []

        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {
                    "role": "system",
                    "content": """You are a precise medical prescription parser.
Extract each medicine separately from the prescription text and return ONLY a valid JSON array with no explanation, no markdown, no code fences.

CRITICAL RULES:
1. Each medicine MUST have its OWN duration_days extracted from the text. NEVER copy the same duration to all medicines.
2. If duration is not mentioned for a specific medicine, set duration_days to null. Do NOT guess or assume.
3. Extract exact dosage_timing for each medicine separately (e.g. 'morning', 'twice daily', 'after lunch', 'at bedtime').
4. before_meal must be true only if explicitly mentioned (e.g. 'before food', 'empty stomach').
5. Return ONLY the JSON array. No text before or after.

Format:
[
    {
        "name": "Medicine name",
        "strength": "500mg",
        "dosage_timing": "morning and night",
        "duration_days": 5,
        "before_meal": false,
        "notes": "any special instructions or null"
    }
]"""
                },
                {
                    "role": "user",
                    "content": f"Extract medicines from this prescription text:\n\n{raw_text}"
                }
            ],
            temperature=0.1,
        )

        result = response.choices[0].message.content.strip()
        print(f"Groq Response:\n{result}")

        if "```" in result:
            result = result.split("```")[1]
            if result.startswith("json"):
                result = result[4:]

        medicines = json.loads(result.strip())
        return medicines

    except json.JSONDecodeError as e:
        print(f"JSON Parse Error: {e}")
        return []
    except Exception as e:
        print(f"OCR Service Error: {e}")
        return []
