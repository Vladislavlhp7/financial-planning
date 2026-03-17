import os
from pathlib import Path

from dotenv import load_dotenv

# Load .env from project root (parent of backend/)
env_path = Path(__file__).resolve().parent.parent.parent / ".env"
load_dotenv(env_path)

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL must be set. Did you forget to provision a database?")

PORT = int(os.getenv("PORT", "8080"))
