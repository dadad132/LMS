"""
Application Configuration
"""
import os
from pathlib import Path

# Base directory
BASE_DIR = Path(__file__).resolve().parent.parent

# Database
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR}/data.db")

# Security
SECRET_KEY = os.getenv("SECRET_KEY", "change-this-in-production-use-a-real-secret-key")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

# Hidden admin path - change this to something unique and hard to guess
ADMIN_SECRET_PATH = os.getenv("ADMIN_SECRET_PATH", "super-secret-admin-panel-2024")

# Upload settings
UPLOAD_DIR = BASE_DIR / "uploads"
MAX_UPLOAD_SIZE = 100 * 1024 * 1024  # 100MB
ALLOWED_EXTENSIONS = {
    'images': {'.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'},
    'videos': {'.mp4', '.webm', '.ogg', '.mov'},
    'documents': {'.pdf', '.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx', '.txt'},
}

# Ensure upload directory exists
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
