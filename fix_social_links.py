"""
Fix social links in the database
Run this on the server: python fix_social_links.py
"""
import sqlite3
import json

# Your social media links - edit these!
social_links = {
    "tiktok": "tiktok.com/@infohoneypotsa.co.za",
    "whatsapp": "whatsapp.com/channel/0029VbATAvT3AzNKOyT6aj3v",
    "facebook": "facebook.com/share/g/16oEBWt7ts",
    "instagram": "instagram.com/honeypottefl",
    "youtube": "www.youtube.com/@HoneypotTEFL"
}

# Connect to database
conn = sqlite3.connect('data.db')
cursor = conn.cursor()

# Update social_links
try:
    cursor.execute(
        "UPDATE site_config SET social_links = ? WHERE id = 1",
        (json.dumps(social_links),)
    )
    conn.commit()
    print("✅ Social links updated successfully!")
    print("\nLinks saved:")
    for platform, url in social_links.items():
        print(f"  {platform}: https://{url}")
except Exception as e:
    print(f"❌ Error: {e}")
finally:
    conn.close()

print("\n⚠️  Remember to restart the service: sudo systemctl restart lms-website")
