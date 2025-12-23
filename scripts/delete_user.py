#!/usr/bin/env python3
"""Delete a user by ID"""
import sys
sys.path.insert(0, '/opt/lms-website')

from app.database import SessionLocal
from app.models.user import User

if len(sys.argv) < 2:
    print("Usage: python3 delete_user.py <user_id>")
    print("Example: python3 delete_user.py 2")
    sys.exit(1)

user_id = int(sys.argv[1])

db = SessionLocal()
user = db.query(User).filter(User.id == user_id).first()

if not user:
    print(f"User with ID {user_id} not found!")
    db.close()
    sys.exit(1)

if user.role.value == 'super_admin':
    print("Cannot delete super_admin!")
    db.close()
    sys.exit(1)

print(f"Deleting user: {user.email} ({user.username})")
db.delete(user)
db.commit()
print("User deleted successfully!")

db.close()
