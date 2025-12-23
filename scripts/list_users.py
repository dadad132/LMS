#!/usr/bin/env python3
"""List all users in the database"""
import sys
sys.path.insert(0, '/opt/lms-website')

from app.database import SessionLocal
from app.models.user import User

db = SessionLocal()
users = db.query(User).all()

print("=" * 60)
print("USERS IN DATABASE")
print("=" * 60)

if not users:
    print("No users found!")
else:
    for u in users:
        print(f"ID: {u.id}")
        print(f"  Email: {u.email}")
        print(f"  Username: {u.username}")
        print(f"  Role: {u.role.value}")
        print(f"  Active: {u.is_active}")
        print("-" * 40)

db.close()
