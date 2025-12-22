"""
Diagnostics and Self-Repair Module
Provides health checks, error detection, and automatic repair capabilities
"""
import os
import sys
import logging
import traceback
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import text

from .config import BASE_DIR, UPLOAD_DIR, DATABASE_URL
from .database import engine, SessionLocal

# Setup logging
LOG_DIR = BASE_DIR / "logs"
LOG_DIR.mkdir(parents=True, exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(LOG_DIR / "app.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("LMS-Diagnostics")


class DiagnosticResult:
    """Represents the result of a diagnostic check"""
    def __init__(self, name: str, status: str, message: str, auto_fixed: bool = False, details: dict = None):
        self.name = name
        self.status = status  # 'ok', 'warning', 'error', 'fixed'
        self.message = message
        self.auto_fixed = auto_fixed
        self.details = details or {}
        self.timestamp = datetime.utcnow()
    
    def to_dict(self):
        return {
            "name": self.name,
            "status": self.status,
            "message": self.message,
            "auto_fixed": self.auto_fixed,
            "details": self.details,
            "timestamp": self.timestamp.isoformat()
        }


class SystemDiagnostics:
    """Main diagnostics and self-repair class"""
    
    def __init__(self):
        self.results: List[DiagnosticResult] = []
        self.errors_fixed = 0
        self.errors_found = 0
    
    def run_all_checks(self, auto_repair: bool = True) -> Dict[str, Any]:
        """Run all diagnostic checks"""
        self.results = []
        self.errors_fixed = 0
        self.errors_found = 0
        
        # Run all checks
        self.check_database_connection()
        self.check_database_tables(auto_repair)
        self.check_site_config(auto_repair)
        self.check_upload_directories(auto_repair)
        self.check_required_files()
        self.check_disk_space()
        self.check_database_integrity(auto_repair)
        self.check_orphaned_files(auto_repair)
        
        # Summary
        overall_status = "healthy"
        if self.errors_found > 0:
            overall_status = "issues_found"
        if self.errors_found > 0 and self.errors_fixed == self.errors_found:
            overall_status = "repaired"
        elif self.errors_found > self.errors_fixed:
            overall_status = "needs_attention"
        
        return {
            "status": overall_status,
            "checks_run": len(self.results),
            "errors_found": self.errors_found,
            "errors_fixed": self.errors_fixed,
            "results": [r.to_dict() for r in self.results],
            "timestamp": datetime.utcnow().isoformat()
        }
    
    def check_database_connection(self) -> DiagnosticResult:
        """Check if database is accessible"""
        try:
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            result = DiagnosticResult(
                "Database Connection",
                "ok",
                "Database is accessible and responding"
            )
        except Exception as e:
            self.errors_found += 1
            logger.error(f"Database connection error: {e}")
            result = DiagnosticResult(
                "Database Connection",
                "error",
                f"Cannot connect to database: {str(e)}",
                details={"error": str(e)}
            )
        
        self.results.append(result)
        return result
    
    def check_database_tables(self, auto_repair: bool = True) -> DiagnosticResult:
        """Check if all required tables exist and create if missing"""
        required_tables = [
            'site_config', 'users', 'pages', 'widgets', 'page_widgets',
            'navigation_menu', 'courses', 'lessons', 'enrollments',
            'media_files', 'contact_inquiries'
        ]
        
        try:
            from .database import Base
            
            with engine.connect() as conn:
                # Get existing tables
                if 'sqlite' in DATABASE_URL:
                    result = conn.execute(text("SELECT name FROM sqlite_master WHERE type='table'"))
                    existing_tables = [row[0] for row in result]
                else:
                    result = conn.execute(text("SHOW TABLES"))
                    existing_tables = [row[0] for row in result]
            
            missing_tables = [t for t in required_tables if t not in existing_tables]
            
            if missing_tables:
                self.errors_found += 1
                if auto_repair:
                    # Create missing tables
                    Base.metadata.create_all(bind=engine)
                    self.errors_fixed += 1
                    result = DiagnosticResult(
                        "Database Tables",
                        "fixed",
                        f"Created missing tables: {', '.join(missing_tables)}",
                        auto_fixed=True,
                        details={"created_tables": missing_tables}
                    )
                    logger.info(f"Auto-created missing tables: {missing_tables}")
                else:
                    result = DiagnosticResult(
                        "Database Tables",
                        "error",
                        f"Missing tables: {', '.join(missing_tables)}",
                        details={"missing_tables": missing_tables}
                    )
            else:
                result = DiagnosticResult(
                    "Database Tables",
                    "ok",
                    "All required database tables exist"
                )
        except Exception as e:
            self.errors_found += 1
            logger.error(f"Database tables check error: {e}")
            result = DiagnosticResult(
                "Database Tables",
                "error",
                f"Error checking tables: {str(e)}",
                details={"error": str(e)}
            )
        
        self.results.append(result)
        return result
    
    def check_site_config(self, auto_repair: bool = True) -> DiagnosticResult:
        """Check if site configuration exists and create default if missing"""
        try:
            from .models.site_config import SiteConfig
            
            db = SessionLocal()
            try:
                config = db.query(SiteConfig).first()
                
                if not config:
                    self.errors_found += 1
                    if auto_repair:
                        # Create default config
                        config = SiteConfig(
                            site_name="My Learning Platform",
                            site_description="Welcome to our learning platform",
                            primary_color="#3b82f6",
                            secondary_color="#10b981",
                            is_setup_complete=False
                        )
                        db.add(config)
                        db.commit()
                        self.errors_fixed += 1
                        result = DiagnosticResult(
                            "Site Configuration",
                            "fixed",
                            "Created default site configuration",
                            auto_fixed=True
                        )
                        logger.info("Auto-created default site configuration")
                    else:
                        result = DiagnosticResult(
                            "Site Configuration",
                            "error",
                            "Site configuration is missing"
                        )
                else:
                    result = DiagnosticResult(
                        "Site Configuration",
                        "ok",
                        f"Site configuration exists: {config.site_name}"
                    )
            finally:
                db.close()
        except Exception as e:
            self.errors_found += 1
            logger.error(f"Site config check error: {e}")
            result = DiagnosticResult(
                "Site Configuration",
                "error",
                f"Error checking site config: {str(e)}",
                details={"error": str(e)}
            )
        
        self.results.append(result)
        return result
    
    def check_upload_directories(self, auto_repair: bool = True) -> DiagnosticResult:
        """Check if upload directories exist and create if missing"""
        required_dirs = [
            UPLOAD_DIR,
            UPLOAD_DIR / "general",
            UPLOAD_DIR / "site",
            UPLOAD_DIR / "Video",
            UPLOAD_DIR / "Info"
        ]
        
        missing_dirs = []
        created_dirs = []
        
        for dir_path in required_dirs:
            if not dir_path.exists():
                missing_dirs.append(str(dir_path))
                if auto_repair:
                    try:
                        dir_path.mkdir(parents=True, exist_ok=True)
                        created_dirs.append(str(dir_path))
                    except Exception as e:
                        logger.error(f"Failed to create directory {dir_path}: {e}")
        
        if missing_dirs:
            self.errors_found += 1
            if created_dirs:
                self.errors_fixed += 1
                result = DiagnosticResult(
                    "Upload Directories",
                    "fixed",
                    f"Created missing directories",
                    auto_fixed=True,
                    details={"created": created_dirs}
                )
                logger.info(f"Auto-created directories: {created_dirs}")
            else:
                result = DiagnosticResult(
                    "Upload Directories",
                    "error",
                    f"Missing directories: {', '.join(missing_dirs)}",
                    details={"missing": missing_dirs}
                )
        else:
            result = DiagnosticResult(
                "Upload Directories",
                "ok",
                "All upload directories exist"
            )
        
        self.results.append(result)
        return result
    
    def check_required_files(self) -> DiagnosticResult:
        """Check if required application files exist"""
        required_files = [
            BASE_DIR / "app" / "main.py",
            BASE_DIR / "app" / "database.py",
            BASE_DIR / "app" / "config.py",
            BASE_DIR / "app" / "templates" / "base.html",
            BASE_DIR / "app" / "templates" / "index.html",
            BASE_DIR / "app" / "static" / "css" / "main.css",
            BASE_DIR / "app" / "static" / "js" / "main.js",
        ]
        
        missing_files = []
        for file_path in required_files:
            if not file_path.exists():
                missing_files.append(str(file_path.relative_to(BASE_DIR)))
        
        if missing_files:
            self.errors_found += 1
            result = DiagnosticResult(
                "Required Files",
                "error",
                f"Missing {len(missing_files)} required files",
                details={"missing_files": missing_files}
            )
        else:
            result = DiagnosticResult(
                "Required Files",
                "ok",
                "All required application files exist"
            )
        
        self.results.append(result)
        return result
    
    def check_disk_space(self) -> DiagnosticResult:
        """Check available disk space"""
        try:
            import shutil
            total, used, free = shutil.disk_usage(BASE_DIR)
            
            free_gb = free / (1024 ** 3)
            total_gb = total / (1024 ** 3)
            used_percent = (used / total) * 100
            
            if free_gb < 1:  # Less than 1GB free
                self.errors_found += 1
                result = DiagnosticResult(
                    "Disk Space",
                    "error",
                    f"Critical: Only {free_gb:.2f}GB free space remaining",
                    details={"free_gb": free_gb, "total_gb": total_gb, "used_percent": used_percent}
                )
            elif free_gb < 5:  # Less than 5GB free
                result = DiagnosticResult(
                    "Disk Space",
                    "warning",
                    f"Warning: Only {free_gb:.2f}GB free space remaining",
                    details={"free_gb": free_gb, "total_gb": total_gb, "used_percent": used_percent}
                )
            else:
                result = DiagnosticResult(
                    "Disk Space",
                    "ok",
                    f"Disk space OK: {free_gb:.2f}GB free of {total_gb:.2f}GB",
                    details={"free_gb": free_gb, "total_gb": total_gb, "used_percent": used_percent}
                )
        except Exception as e:
            result = DiagnosticResult(
                "Disk Space",
                "warning",
                f"Could not check disk space: {str(e)}"
            )
        
        self.results.append(result)
        return result
    
    def check_database_integrity(self, auto_repair: bool = True) -> DiagnosticResult:
        """Check database integrity and fix common issues"""
        issues = []
        fixed = []
        
        try:
            db = SessionLocal()
            try:
                # Check for orphaned enrollments (enrollments without valid course/user)
                from .models.course import Enrollment, Course
                from .models.user import User
                
                orphaned_enrollments = db.query(Enrollment).filter(
                    ~Enrollment.course_id.in_(db.query(Course.id))
                ).all()
                
                if orphaned_enrollments:
                    issues.append(f"{len(orphaned_enrollments)} orphaned enrollments")
                    if auto_repair:
                        for e in orphaned_enrollments:
                            db.delete(e)
                        db.commit()
                        fixed.append("Removed orphaned enrollments")
                
                # Check for courses without valid instructor
                invalid_courses = db.query(Course).filter(
                    Course.instructor_id.isnot(None),
                    ~Course.instructor_id.in_(db.query(User.id))
                ).all()
                
                if invalid_courses:
                    issues.append(f"{len(invalid_courses)} courses with invalid instructor")
                    if auto_repair:
                        for c in invalid_courses:
                            c.instructor_id = None
                        db.commit()
                        fixed.append("Fixed courses with invalid instructor")
                
            finally:
                db.close()
            
            if issues:
                self.errors_found += 1
                if fixed:
                    self.errors_fixed += 1
                    result = DiagnosticResult(
                        "Database Integrity",
                        "fixed",
                        f"Fixed {len(fixed)} integrity issues",
                        auto_fixed=True,
                        details={"issues": issues, "fixed": fixed}
                    )
                else:
                    result = DiagnosticResult(
                        "Database Integrity",
                        "warning",
                        f"Found {len(issues)} integrity issues",
                        details={"issues": issues}
                    )
            else:
                result = DiagnosticResult(
                    "Database Integrity",
                    "ok",
                    "Database integrity check passed"
                )
        except Exception as e:
            logger.error(f"Database integrity check error: {e}")
            result = DiagnosticResult(
                "Database Integrity",
                "warning",
                f"Could not complete integrity check: {str(e)}"
            )
        
        self.results.append(result)
        return result
    
    def check_orphaned_files(self, auto_repair: bool = False) -> DiagnosticResult:
        """Check for orphaned uploaded files not referenced in database"""
        try:
            from .models.media import MediaFile
            
            db = SessionLocal()
            try:
                # Get all files in upload directory
                uploaded_files = set()
                for folder in UPLOAD_DIR.iterdir():
                    if folder.is_dir():
                        for file in folder.iterdir():
                            if file.is_file() and file.name != '.gitkeep':
                                uploaded_files.add(f"/uploads/{folder.name}/{file.name}")
                
                # Get all files referenced in database
                db_files = set()
                media_files = db.query(MediaFile).all()
                for mf in media_files:
                    db_files.add(mf.file_url)
                
                # Find orphaned files
                orphaned = uploaded_files - db_files
                
                if orphaned:
                    result = DiagnosticResult(
                        "Orphaned Files",
                        "warning",
                        f"Found {len(orphaned)} files not tracked in database",
                        details={"orphaned_count": len(orphaned), "sample": list(orphaned)[:5]}
                    )
                else:
                    result = DiagnosticResult(
                        "Orphaned Files",
                        "ok",
                        "No orphaned files found"
                    )
            finally:
                db.close()
        except Exception as e:
            result = DiagnosticResult(
                "Orphaned Files",
                "warning",
                f"Could not check orphaned files: {str(e)}"
            )
        
        self.results.append(result)
        return result


class ErrorHandler:
    """Global error handler with logging and recovery"""
    
    @staticmethod
    def log_error(error: Exception, context: str = "", user_id: int = None):
        """Log an error with full context"""
        error_info = {
            "timestamp": datetime.utcnow().isoformat(),
            "error_type": type(error).__name__,
            "error_message": str(error),
            "context": context,
            "user_id": user_id,
            "traceback": traceback.format_exc()
        }
        
        logger.error(f"Error in {context}: {error}", exc_info=True)
        
        # Save to error log file
        error_log_path = LOG_DIR / "errors.log"
        with open(error_log_path, "a", encoding="utf-8") as f:
            f.write(f"\n{'='*50}\n")
            f.write(f"Time: {error_info['timestamp']}\n")
            f.write(f"Context: {context}\n")
            f.write(f"Error: {error_info['error_type']}: {error_info['error_message']}\n")
            f.write(f"Traceback:\n{error_info['traceback']}\n")
        
        return error_info
    
    @staticmethod
    def attempt_recovery(error: Exception, context: str) -> bool:
        """Attempt automatic recovery based on error type"""
        error_type = type(error).__name__
        
        recovery_actions = {
            "OperationalError": ErrorHandler._recover_database,
            "IntegrityError": ErrorHandler._recover_integrity,
            "FileNotFoundError": ErrorHandler._recover_missing_file,
            "PermissionError": ErrorHandler._recover_permissions,
        }
        
        if error_type in recovery_actions:
            try:
                return recovery_actions[error_type](error, context)
            except Exception as e:
                logger.error(f"Recovery failed: {e}")
                return False
        
        return False
    
    @staticmethod
    def _recover_database(error: Exception, context: str) -> bool:
        """Attempt database recovery"""
        try:
            from .database import init_db
            init_db()
            logger.info("Database recovery: Reinitialized database")
            return True
        except:
            return False
    
    @staticmethod
    def _recover_integrity(error: Exception, context: str) -> bool:
        """Attempt to recover from integrity error by rolling back"""
        try:
            db = SessionLocal()
            db.rollback()
            db.close()
            logger.info("Integrity recovery: Rolled back transaction")
            return True
        except:
            return False
    
    @staticmethod
    def _recover_missing_file(error: Exception, context: str) -> bool:
        """Attempt to recover from missing file"""
        try:
            # Recreate upload directories if missing
            UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
            for subdir in ["general", "site", "Video", "Info"]:
                (UPLOAD_DIR / subdir).mkdir(parents=True, exist_ok=True)
            logger.info("File recovery: Recreated upload directories")
            return True
        except:
            return False
    
    @staticmethod
    def _recover_permissions(error: Exception, context: str) -> bool:
        """Log permission error - usually requires manual intervention"""
        logger.warning(f"Permission error in {context} - manual intervention may be required")
        return False


# Global diagnostics instance
diagnostics = SystemDiagnostics()
error_handler = ErrorHandler()
