#!/usr/bin/env python3
"""
LMS Website Builder - Run Script
Start the development server
"""
import uvicorn
import socket
from app.database import init_db

def get_local_ip():
    """Get the local IP address of the machine"""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except:
        return "localhost"

if __name__ == "__main__":
    print("🎓 LMS Website Builder")
    print("=" * 60)
    
    # Initialize database
    print("📦 Initializing database...")
    init_db()
    print("✅ Database ready!")
    
    local_ip = get_local_ip()
    
    print("\n🚀 Starting server...")
    print("=" * 60)
    print(f"🏠 Local access:    http://localhost:8000")
    print(f"🌐 Network access:  http://{local_ip}:8000")
    print("=" * 60)
    print("\n📱 Anyone on your network can access the site using the Network URL")
    print("🔐 Admin panel will be available after setup")
    print("\n💡 For PUBLIC access from anywhere on the internet, you can:")
    print("   1. Use Cloudflare Tunnel (free): cloudflared tunnel --url http://localhost:8000")
    print("   2. Use ngrok with auth token: ngrok http 8000")
    print("   3. Configure port forwarding on your router")
    print("=" * 60)
    
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        reload_dirs=["app"]
    )
