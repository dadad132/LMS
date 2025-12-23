#!/usr/bin/env python3
"""
Post-Update Hook Script
This script runs automatically after pulling updates from GitHub.
Add any post-update tasks here (database changes, migrations, cleanup, etc.)

The system update process runs these steps in order:
1. git fetch origin
2. git reset --hard origin/main
3. pip install -r requirements.txt --upgrade
4. python migrate_db.py (if exists)
5. python scripts/post_update.py (THIS FILE)
6. systemctl restart lms-website
"""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def run_post_update():
    """Run all post-update tasks"""
    print("="*60)
    print("Running post-update hooks...")
    print("="*60)
    
    tasks_run = []
    
    # ==================== ADD YOUR CUSTOM TASKS HERE ====================
    
    # Example: Database table creation/updates
    try:
        from app.database import engine, Base
        from app.models import user, course, site_config, media, contact
        
        # Create any new tables that don't exist yet
        Base.metadata.create_all(bind=engine)
        tasks_run.append("✓ Database tables synced")
        print("✓ Database tables synced")
    except Exception as e:
        print(f"✗ Database sync failed: {e}")
    
    # Example: Clean up temp files
    try:
        import shutil
        from pathlib import Path
        
        temp_dir = Path(__file__).parent.parent / "temp"
        if temp_dir.exists():
            shutil.rmtree(temp_dir)
            tasks_run.append("✓ Temp files cleaned")
            print("✓ Temp files cleaned")
    except Exception as e:
        pass  # No temp dir, that's fine
    
    # Example: Clear any caches
    try:
        cache_dir = Path(__file__).parent.parent / "__pycache__"
        # We don't delete pycache, just note it exists
        pass
    except:
        pass
    
    # ==================== END CUSTOM TASKS ====================
    
    print("="*60)
    print(f"Post-update complete. {len(tasks_run)} tasks run.")
    print("="*60)
    
    return tasks_run

if __name__ == "__main__":
    run_post_update()
