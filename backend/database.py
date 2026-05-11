from motor.motor_asyncio import AsyncIOMotorClient
from .config import settings
import json
import os
from datetime import datetime

class Database:
    client: AsyncIOMotorClient = None
    db = None

db_instance = Database()

async def connect_to_mongo():
    try:
        db_instance.client = AsyncIOMotorClient(settings.MONGODB_URL, serverSelectionTimeoutMS=2000)
        db_instance.db = db_instance.client[settings.DATABASE_NAME]
        # Check if connection is successful
        await db_instance.client.server_info()
        print("Connected to MongoDB")
    except Exception as e:
        print(f"MongoDB connection failed: {e}. Using Mock Data mode.")
        db_instance.client = None
        db_instance.db = None

async def close_mongo_connection():
    if db_instance.client:
        db_instance.client.close()
        print("Closed MongoDB connection")

async def get_mock_expenses():
    mock_path = os.path.join(os.path.dirname(__file__), "..", "dataset", "mock_expenses.json")
    if os.path.exists(mock_path):
        with open(mock_path, "r") as f:
            data = json.load(f)
            # Assign mock _id to each expense if not present
            for i, expense in enumerate(data):
                if '_id' not in expense:
                    expense['_id'] = f"mock_{i+1}"
            return data
    return []
