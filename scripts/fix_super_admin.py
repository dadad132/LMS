#!/usr/bin/env python3
"""
Fix Super Admin Role - Upgrade a user to super_admin
Run this on your VPS: python scripts/fix_super_admin.py
"""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.models.user import User, UserRole

def list_all_users():
    """List all users and their roles"""
    db = SessionLocal()
    try:
        users = db.query(User).all()
        print("\n" + "="*60)
        print("ALL USERS IN DATABASE:")
        print("="*60)
        for user in users:
            role_display = user.role.value if hasattr(user.role, 'value') else str(user.role)
            marker = " <-- SUPER ADMIN" if role_display == 'super_admin' else ""
            print(f"  ID: {user.id} | {user.username} | {user.email} | Role: {role_display}{marker}")
        print("="*60)
        return users
    finally:
        db.close()

def upgrade_to_super_admin(identifier):
    """Upgrade a user to super_admin by ID, username, or email"""
    db = SessionLocal()
    try:
        # Try to find user by ID, username, or email
        user = None
        if identifier.isdigit():
            user = db.query(User).filter(User.id == int(identifier)).first()
        if not user:
            user = db.query(User).filter(User.username == identifier).first()
        if not user:
            user = db.query(User).filter(User.email == identifier).first()
        
        if not user:
            print(f"\n❌ User not found: {identifier}")
            return False
        
        old_role = user.role.value if hasattr(user.role, 'value') else str(user.role)
        
        # Upgrade to super_admin
        user.role = UserRole.super_admin
        db.commit()
        
        print(f"\n✅ SUCCESS!")
        print(f"   User: {user.username} ({user.email})")
        print(f"   Role changed: {old_role} → super_admin")
        return True
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        db.rollback()
        return False
    finally:
        db.close()

def main():
    print("\n🔧 SUPER ADMIN FIX TOOL")
    print("="*60)
    
    # First, list all users
    users = list_all_users()
    
    if not users:
        print("\nNo users found in database!")
        return
    
    # Check if there's any super_admin
    super_admins = [u for u in users if (u.role.value if hasattr(u.role, 'value') else str(u.role)) == 'super_admin']
    
    if super_admins:
        print(f"\n✅ Found {len(super_admins)} super_admin(s) in the system.")
    else:
        print("\n⚠️  WARNING: No super_admin found in the system!")
    
    # Ask which user to upgrade
    print("\nEnter the ID, username, or email of the user to upgrade to super_admin")
    print("(or press Enter to skip):")
    
    identifier = input("\n> ").strip()
    
    if identifier:
        upgrade_to_super_admin(identifier)
        print("\n" + "-"*60)
        print("Updated user list:")
        list_all_users()
    else:
        print("\nNo changes made.")

if __name__ == "__main__":
    main()
