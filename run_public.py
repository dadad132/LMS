#!/usr/bin/env python3
"""
LMS Website Builder - Public Access with Cloudflare Tunnel
This script starts the server and creates a public URL using Cloudflare's free tunnel service.

Requirements:
1. Download cloudflared from: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/
2. Or install via: winget install Cloudflare.cloudflared (Windows)
3. Or: choco install cloudflared (with Chocolatey)
"""
import uvicorn
import subprocess
import threading
import time
import sys
import os
from app.database import init_db

def run_server():
    """Run the FastAPI server"""
    uvicorn.run(
        "app.main:app",
        host="127.0.0.1",
        port=8000,
        reload=False
    )

def run_cloudflare_tunnel():
    """Run cloudflared tunnel"""
    time.sleep(2)  # Wait for server to start
    
    try:
        # Run cloudflared and capture output
        process = subprocess.Popen(
            ["cloudflared", "tunnel", "--url", "http://localhost:8000"],
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1
        )
        
        print("\n" + "=" * 60)
        print("🌐 CLOUDFLARE TUNNEL STARTING...")
        print("=" * 60)
        print("⏳ Please wait for the public URL to appear below...\n")
        
        # Read output and look for the URL
        for line in process.stdout:
            # Look for the tunnel URL
            if "https://" in line and ".trycloudflare.com" in line:
                # Extract the URL
                import re
                url_match = re.search(r'https://[a-zA-Z0-9-]+\.trycloudflare\.com', line)
                if url_match:
                    public_url = url_match.group()
                    print("\n" + "=" * 60)
                    print("🎉 PUBLIC ACCESS ENABLED!")
                    print("=" * 60)
                    print(f"\n📌 Your LMS is now accessible from ANYWHERE at:")
                    print(f"\n   ✨ {public_url} ✨")
                    print(f"\n💡 Share this URL with anyone to access your LMS!")
                    print(f"📝 Local access: http://localhost:8000")
                    print("\n⚠️  Note: This URL changes each time you restart.")
                    print("    For a permanent URL, create a free Cloudflare account.")
                    print("=" * 60 + "\n")
            elif "connection" in line.lower() or "error" in line.lower():
                print(f"   {line.strip()}")
                
    except FileNotFoundError:
        print("\n" + "=" * 60)
        print("❌ CLOUDFLARED NOT FOUND!")
        print("=" * 60)
        print("\nPlease install cloudflared first:")
        print("\n📦 Windows (winget):")
        print("   winget install Cloudflare.cloudflared")
        print("\n📦 Windows (manual):")
        print("   Download from: https://github.com/cloudflare/cloudflared/releases")
        print("\n📦 macOS:")
        print("   brew install cloudflared")
        print("\n📦 Linux:")
        print("   See: https://pkg.cloudflare.com/")
        print("=" * 60)
        print("\n🔄 Continuing with local access only...")
        print(f"📝 Local access: http://localhost:8000")
        
    except Exception as e:
        print(f"\n❌ Error starting tunnel: {e}")
        print(f"📝 Server is still running locally at: http://localhost:8000")

if __name__ == "__main__":
    print("🎓 LMS Website Builder - PUBLIC ACCESS MODE")
    print("=" * 60)
    
    # Initialize database
    print("📦 Initializing database...")
    init_db()
    print("✅ Database ready!")
    
    print("\n🚀 Starting server and creating public tunnel...")
    
    # Start cloudflared tunnel in a separate thread
    tunnel_thread = threading.Thread(target=run_cloudflare_tunnel, daemon=True)
    tunnel_thread.start()
    
    # Run the server (blocking)
    run_server()
