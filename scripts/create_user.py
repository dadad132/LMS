#!/usr/bin/env python3
"""Create a new user"""
import sys
sys.path.insert(0, '/opt/lms-website')

from app.database import SessionLocal
from app.models.user import User, UserRole
from app.api.auth import get_password_hash

# Configuration - CHANGE THESE
EMAIL = "newuser@example.com"
USERNAME = "newuser"
PASSWORD = "Password123!"
FULL_NAME = "New User"
ROLE = "user"  # "user" or "admin"

db = SessionLocal()

# Check if email exists
if db.query(User).filter(User.email == EMAIL).first():
    print(f"Error: Email {EMAIL} already exists!")
    db.close()
    sys.exit(1)

# Check if username exists
if db.query(User).filter(User.username == USERNAME).first():
    print(f"Error: Username {USERNAME} already exists!")
    db.close()
    sys.exit(1)

# Create user
role = UserRole.ADMIN if ROLE == "admin" else UserRole.USER
user = User(
    email=EMAIL,
    username=USERNAME,
    hashed_password=get_password_hash(PASSWORD),
    full_name=FULL_NAME,
    role=role,
    is_active=True
)

db.add(user)
db.commit()
db.refresh(user)

print("=" * 60)
print("USER CREATED SUCCESSFULLY!")
print("=" * 60)
print(f"Email: {EMAIL}")
print(f"Username: {USERNAME}")
print(f"Password: {PASSWORD}")
print(f"Role: {ROLE}")
print("=" * 60)

db.close()
