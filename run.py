#!/usr/bin/env python3
"""
LMS Website Builder - Run Script
Start the development server
"""
import uvicorn
from app.database import init_db

if __name__ == "__main__":
    print("🎓 LMS Website Builder")
    print("=" * 50)
    
    # Initialize database
    print("📦 Initializing database...")
    init_db()
    print("✅ Database ready!")
    
    print("\n🚀 Starting server...")
    print("=" * 50)
    print("🌐 Open http://localhost:8000 in your browser")
    print("🔐 Admin panel will be available after setup")
    print("=" * 50)
    
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        reload_dirs=["app"]
    )
