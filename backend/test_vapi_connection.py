import os
import sys
import requests
from dotenv import load_dotenv

def main():
    print("--- Vapi Connection Test ---")
    # Load .env file from the current directory (backend)
    load_dotenv()
    
    api_key = os.getenv("VAPI_API_KEY")
    assistant_id = os.getenv("VAPI_ASSISTANT_ID")
    phone_number_id = os.getenv("VAPI_PHONE_NUMBER_ID")

    print("\n1. Configuration Validation:")
    if not api_key:
        print("ERROR: VAPI_API_KEY is missing.")
    else:
        prefix = api_key[:6] if len(api_key) >= 6 else "***"
        print(f"VAPI_API_KEY prefix: {prefix}")

    if not assistant_id:
        print("ERROR: VAPI_ASSISTANT_ID is missing.")
    else:
        print(f"VAPI_ASSISTANT_ID: {assistant_id}")

    if not phone_number_id:
        print("ERROR: VAPI_PHONE_NUMBER_ID is missing.")
    else:
        print(f"VAPI_PHONE_NUMBER_ID: {phone_number_id}")

    if not api_key or not assistant_id or not phone_number_id:
        print("\nABORTING: Missing required configuration.")
        sys.exit(1)

    print("\n2. Testing Authentication (without making a call):")
    # Using the /assistant endpoint to verify the API key is valid (needs Private Key)
    # Fetching the specific assistant details verifies both auth and the Assistant ID.
    url = f"https://api.vapi.ai/assistant/{assistant_id}"
    
    headers = {
        "Authorization": f"Bearer {api_key}"
    }

    print(f"GET {url}")
    print("Headers: {'Authorization': 'Bearer " + prefix + "...'}")

    try:
        response = requests.get(url, headers=headers, timeout=10)
        print("\n--- Response ---")
        print(f"Status Code: {response.status_code}")
        print("Response Body:")
        print(response.text)

        print("\n--- Conclusion ---")
        if response.status_code == 200:
            print("SUCCESS: Authentication successful! The API key is valid and the Assistant ID is correct.")
        elif response.status_code == 401:
            print("FAILURE: Authentication failed (401). You are likely using the Public Key instead of the Private Key, or the key is invalid.")
        elif response.status_code == 404:
            print("WARNING: Authentication succeeded, but the Assistant ID was not found (404). Please verify VAPI_ASSISTANT_ID.")
        else:
            print(f"FAILURE: Unexpected status code {response.status_code}.")
            
    except Exception as e:
        print(f"\nFAILURE: Request exception: {e}")

if __name__ == "__main__":
    main()
