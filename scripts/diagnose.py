#!/usr/bin/env python3
"""Check server logs and diagnose issues"""
import sys
sys.path.insert(0, '/opt/lms-website')

print("=" * 60)
print("LMS DIAGNOSTICS")
print("=" * 60)

# Test database connection
print("\n[1] Testing database connection...")
try:
    from app.database import SessionLocal
    db = SessionLocal()
    db.execute("SELECT 1")
    print("    ✓ Database connection OK")
    db.close()
except Exception as e:
    print(f"    ✗ Database error: {e}")

# Test user model
print("\n[2] Testing user model...")
try:
    from app.models.user import User
    db = SessionLocal()
    count = db.query(User).count()
    print(f"    ✓ User model OK ({count} users)")
    db.close()
except Exception as e:
    print(f"    ✗ User model error: {e}")

# Test password hashing
print("\n[3] Testing password hashing...")
try:
    from app.api.auth import get_password_hash, verify_password
    hashed = get_password_hash("test123")
    if verify_password("test123", hashed):
        print("    ✓ Password hashing OK")
    else:
        print("    ✗ Password verification failed")
except Exception as e:
    print(f"    ✗ Password hashing error: {e}")

# Test site config
print("\n[4] Testing site config...")
try:
    from app.models.site_config import SiteConfig
    db = SessionLocal()
    config = db.query(SiteConfig).first()
    if config:
        print(f"    ✓ Site config OK (Site: {config.site_name})")
    else:
        print("    ⚠ No site config found")
    db.close()
except Exception as e:
    print(f"    ✗ Site config error: {e}")

print("\n" + "=" * 60)
print("DIAGNOSTICS COMPLETE")
print("=" * 60)
