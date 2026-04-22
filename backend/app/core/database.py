import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path

# Load env from parent dir of 'app'
ROOT_DIR = Path(__file__).parent.parent.parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ.get('MONGO_URL')
db_name = os.environ.get('DB_NAME')

if not mongo_url:
    raise RuntimeError("MONGO_URL not found in environment")

client = AsyncIOMotorClient(mongo_url)
db = client[db_name or 'doc_analyzer_db']
