from pymongo import MongoClient
from dotenv import load_dotenv
import os

load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI")

client = MongoClient(
    MONGODB_URI,
    serverSelectionTimeoutMS=30000,
    connectTimeoutMS=30000
)

try:
    print(client.admin.command("ping"))
    print("Connected!")
except Exception as e:
    print("ERROR:", e)

db = client["civic_db"]

complaints = db["complaints"]
users = db["users"]