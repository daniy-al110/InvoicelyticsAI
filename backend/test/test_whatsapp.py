import os
import sys
from pathlib import Path

# Add the backend directory to sys.path so we can import app
backend_dir = Path(__file__).parent.parent.parent
sys.path.append(str(backend_dir))

from app.services.whatsapp import whatsapp_service

def test_connection():
    print("--- WhatsApp Connection Test ---")
    test_number = "923392252905"  # Your number from the screenshot
    test_message = "Invoicelytics AI: WhatsApp integration is now active! This is a test message from your backend."
    
    print(f"Sending test message to {test_number}...")
    result = whatsapp_service.send_text_message(test_number, test_message)
    
    if result:
        print("SUCCESS! Message sent.")
        print(f"Response: {result}")
    else:
        print("FAILED to send message. Check your .env credentials and Evolution API status.")

if __name__ == "__main__":
    test_connection()
