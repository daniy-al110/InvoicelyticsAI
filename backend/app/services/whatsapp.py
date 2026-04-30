import os
import requests
import logging
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables
# This assumes the service is in backend/app/services/
backend_dir = Path(__file__).parent.parent.parent
load_dotenv(backend_dir / '.env')

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class WhatsAppService:
    def __init__(self):
        self.base_url = os.environ.get("EVOLUTION_BASE_URL", "").rstrip("/")
        self.instance_name = os.environ.get("EVOLUTION_INSTANCE_NAME", "")
        self.api_key = os.environ.get("EVOLUTION_API_KEY", "")
        
        if not all([self.base_url, self.instance_name, self.api_key]):
            logger.warning("WhatsAppService: Evolution API credentials not properly configured in .env")

    def normalize_phone(self, phone: str) -> str:
        """Removes non-numeric characters and converts local formats (03...) to international (923...)."""
        nums = "".join(filter(str.isdigit, phone))
        
        # Handle Pakistani local format (e.g., 0333... -> 92333...)
        if nums.startswith("03") and len(nums) == 11:
            nums = "92" + nums[1:]
        # Handle format starting with 3 (e.g., 333... -> 92333...)
        elif nums.startswith("3") and len(nums) == 10:
            nums = "92" + nums
            
        return nums

    def send_text_message(self, phone: str, text: str):
        """Sends a simple text message via Evolution API."""
        if not self.base_url or not self.instance_name or not self.api_key:
            logger.error("WhatsAppService: Cannot send message due to missing configuration.")
            return None

        clean_number = self.normalize_phone(phone)
        
        url = f"{self.base_url}/message/sendText/{self.instance_name}"
        
        headers = {
            "Content-Type": "application/json",
            "apikey": self.api_key
        }
        
        payload = {
            "number": clean_number,
            "text": text
        }
        
        try:
            logger.info(f"WhatsAppService: Sending message to {clean_number}")
            response = requests.post(url, json=payload, headers=headers, timeout=10)
            response.raise_for_status()
            logger.info(f"WhatsAppService: Message sent successfully to {clean_number}")
            return response.json()
        except requests.exceptions.RequestException as e:
            logger.error(f"WhatsAppService Error sending to {clean_number}: {str(e)}")
            if hasattr(e, 'response') and e.response is not None:
                logger.error(f"Response Body: {e.response.text}")
            return None

    def check_number_exists(self, phone: str) -> bool:
        """Checks if a number is registered on WhatsApp via Evolution API."""
        if not self.base_url or not self.instance_name or not self.api_key:
            logger.warning("WhatsAppService: Cannot check number due to missing config.")
            return True # Fail open if not configured
            
        clean_number = self.normalize_phone(phone)
        url = f"{self.base_url}/chat/whatsappNumbers/{self.instance_name}"
        
        headers = {
            "Content-Type": "application/json",
            "apikey": self.api_key
        }
        payload = {"numbers": [clean_number]}
        
        try:
            response = requests.post(url, json=payload, headers=headers, timeout=10)
            response.raise_for_status()
            data = response.json()
            if data and isinstance(data, list) and len(data) > 0:
                return data[0].get("exists", False)
            return False
        except requests.exceptions.RequestException as e:
            logger.error(f"WhatsAppService Error checking number {clean_number}: {str(e)}")
            if hasattr(e, 'response') and e.response is not None:
                logger.error(f"Response Body: {e.response.text}")
            return True # Fail open to prevent blocking users if API is down

# Singleton instance
whatsapp_service = WhatsAppService()
