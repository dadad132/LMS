"""
Main FastAPI Application
"""
from fastapi import FastAPI, Request, Depends
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse, RedirectResponse, JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from pathlib import Path
import traceback
import logging

from .database import init_db, get_db
from .models.user import User
from .models.site_config import SiteConfig, Widget
from .models.contact import ContactInquiry
from .api.auth import get_current_user
from .api.auth_routes import router as auth_router
from .api.admin_routes import router as admin_router
from .api.course_routes import router as course_router
from .api.contact_routes import router as contact_router
from .config import ADMIN_SECRET_PATH, UPLOAD_DIR

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("LMS")

# Initialize FastAPI
app = FastAPI(
    title="LMS Website Builder",
    description="A customizable Learning Management System with website builder capabilities",
    version="1.0.0"
)

# Setup templates and static files
BASE_DIR = Path(__file__).resolve().parent
templates = Jinja2Templates(directory=str(BASE_DIR / "templates"))

# Ensure logs directory exists
LOGS_DIR = BASE_DIR.parent / "logs"
LOGS_DIR.mkdir(parents=True, exist_ok=True)


# ==================== Global Error Handlers ====================

def log_error(error: Exception, context: str = ""):
    """Log error to file and console"""
    from datetime import datetime
    error_log_path = LOGS_DIR / "errors.log"
    
    error_info = f"""
{'='*50}
Time: {datetime.utcnow().isoformat()}
Context: {context}
Error Type: {type(error).__name__}
Error Message: {str(error)}
Traceback:
{traceback.format_exc()}
"""
    logger.error(f"Error in {context}: {error}")
    
    try:
        with open(error_log_path, "a", encoding="utf-8") as f:
            f.write(error_info)
    except Exception as e:
        logger.error(f"Failed to write to error log: {e}")


def attempt_auto_repair(error: Exception) -> bool:
    """Attempt automatic repair based on error type"""
    try:
        error_type = type(error).__name__
        
        if "OperationalError" in error_type or "DatabaseError" in error_type:
            # Try to reinitialize database connection
            init_db()
            logger.info("Auto-repair: Reinitialized database")
            return True
        
        if "FileNotFoundError" in error_type:
            # Recreate upload directories
            UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
            for subdir in ["general", "site", "Video", "Info"]:
                (UPLOAD_DIR / subdir).mkdir(parents=True, exist_ok=True)
            logger.info("Auto-repair: Recreated upload directories")
            return True
        
        return False
    except Exception as e:
        logger.error(f"Auto-repair failed: {e}")
        return False


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    """Handle HTTP exceptions with custom error pages"""
    # For API requests, return JSON
    if request.url.path.startswith("/api/"):
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "success": False,
                "error": exc.detail,
                "status_code": exc.status_code
            }
        )
    
    # For web requests, show error page
    if exc.status_code == 404:
        return templates.TemplateResponse(
            "404.html",
            {"request": request, "site_config": SiteConfig()},
            status_code=404
        )
    
    # Generic error page for other errors
    return templates.TemplateResponse(
        "error.html",
        {
            "request": request,
            "site_config": SiteConfig(),
            "error_code": exc.status_code,
            "error_message": exc.detail
        },
        status_code=exc.status_code
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle validation errors"""
    log_error(exc, f"Validation error at {request.url.path}")
    
    return JSONResponse(
        status_code=422,
        content={
            "success": False,
            "error": "Validation error",
            "details": exc.errors()
        }
    )


@app.exception_handler(SQLAlchemyError)
async def sqlalchemy_exception_handler(request: Request, exc: SQLAlchemyError):
    """Handle database errors with auto-repair attempt"""
    log_error(exc, f"Database error at {request.url.path}")
    
    # Attempt auto-repair
    repaired = attempt_auto_repair(exc)
    
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": "Database error occurred",
            "auto_repair_attempted": repaired,
            "message": "The system detected a database issue. " + 
                      ("An automatic repair was attempted." if repaired else "Please try again or contact support.")
        }
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Catch-all exception handler with auto-repair"""
    log_error(exc, f"Unhandled error at {request.url.path}")
    
    # Attempt auto-repair
    repaired = attempt_auto_repair(exc)
    
    # For API requests
    if request.url.path.startswith("/api/"):
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": "An unexpected error occurred",
                "auto_repair_attempted": repaired,
                "message": "The system encountered an error. " +
                          ("An automatic repair was attempted. Please try again." if repaired else "Please try again later.")
            }
        )
    
    # For web requests
    return templates.TemplateResponse(
        "error.html",
        {
            "request": request,
            "site_config": SiteConfig(),
            "error_code": 500,
            "error_message": "An unexpected error occurred. Please try again later."
        },
        status_code=500
    )


# Mount static files
app.mount("/static", StaticFiles(directory=str(BASE_DIR / "static")), name="static")
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

# Include API routers
app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(course_router)
app.include_router(contact_router)


@app.on_event("startup")
async def startup_event():
    """Initialize database and create default widgets on startup"""
    logger.info("Starting LMS Website Builder...")
    
    # Run startup diagnostics
    try:
        from .diagnostics import SystemDiagnostics
        diagnostics = SystemDiagnostics()
        results = diagnostics.run_all_checks(auto_repair=True)
        
        if results["errors_fixed"] > 0:
            logger.info(f"Startup diagnostics: Fixed {results['errors_fixed']} issues")
        logger.info(f"Startup diagnostics: System status is {results['status']}")
    except Exception as e:
        logger.warning(f"Startup diagnostics failed: {e}")
    
    init_db()

    # Create default widgets if they don't exist
    from .database import SessionLocal
    db = SessionLocal()
    try:
        if db.query(Widget).count() == 0:
            default_widgets = [
                Widget(name="Hero Section", widget_type="hero", is_system=True, default_config={
                    "title": "Welcome to Our Platform",
                    "subtitle": "Start your learning journey today",
                    "button_text": "Get Started",
                    "button_url": "/courses",
                    "background_image": ""
                }),
                Widget(name="Text Block", widget_type="text", is_system=True, default_config={
                    "content": "<p>Enter your content here...</p>",
                    "alignment": "left"
                }),
                Widget(name="Image", widget_type="image", is_system=True, default_config={
                    "src": "",
                    "alt": "",
                    "caption": "",
                    "width": "100%"
                }),
                Widget(name="Video", widget_type="video", is_system=True, default_config={
                    "url": "",
                    "autoplay": False,
                    "controls": True
                }),
                Widget(name="Features Grid", widget_type="features", is_system=True, default_config={
                    "title": "Our Features",
                    "columns": 3,
                    "features": []
                }),
                Widget(name="Call to Action", widget_type="cta", is_system=True, default_config={
                    "title": "Ready to get started?",
                    "description": "Join thousands of learners today",
                    "button_text": "Sign Up Now",
                    "button_url": "/register"
                }),
                Widget(name="Course List", widget_type="course_list", is_system=True, default_config={
                    "title": "Featured Courses",
                    "limit": 6,
                    "show_featured_only": True
                }),
                Widget(name="Accordion/FAQ", widget_type="accordion", is_system=True, default_config={
                    "title": "Frequently Asked Questions",
                    "items": []
                }),
                Widget(name="Dropdown Menu", widget_type="dropdown", is_system=True, default_config={
                    "label": "Select an option",
                    "items": []
                }),
                Widget(name="Contact Form", widget_type="form", is_system=True, default_config={
                    "title": "Contact Us",
                    "fields": ["name", "email", "message"],
                    "submit_text": "Send Message"
                }),
                Widget(name="Testimonials", widget_type="testimonials", is_system=True, default_config={
                    "title": "What Our Students Say",
                    "testimonials": []
                }),
                Widget(name="Statistics", widget_type="stats", is_system=True, default_config={
                    "items": [
                        {"label": "Students", "value": "1000+"},
                        {"label": "Courses", "value": "50+"},
                        {"label": "Instructors", "value": "20+"}
                    ]
                })
            ]
            for widget in default_widgets:
                db.add(widget)
            db.commit()
    finally:
        db.close()


def get_site_config(db: Session):
    """Get site configuration or return defaults - always get fresh data from database"""
    # Force SQLAlchemy to query the database fresh (not use cached data)
    db.expire_all()
    
    # Use a fresh query to get the latest config
    config = db.query(SiteConfig).first()
    
    if config:
        # Explicitly refresh the object to ensure all attributes are up to date
        db.refresh(config)
        return config
    
    return SiteConfig()  # Return default config if none exists


def add_no_cache_headers(response):
    """Add headers to prevent browser caching"""
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response


# ==================== Web Routes ====================

@app.get("/", response_class=HTMLResponse)
async def home(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Home page - shows setup if not configured, otherwise landing/dashboard"""
    # Check if setup is needed
    user_count = db.query(User).count()
    if user_count == 0:
        return RedirectResponse(url="/setup", status_code=302)

    site_config = get_site_config(db)

    response = templates.TemplateResponse("index.html", {
        "request": request,
        "site_config": site_config,
        "current_user": current_user
    })

    return add_no_cache_headers(response)


@app.get("/setup", response_class=HTMLResponse)
async def setup_page(
    request: Request,
    db: Session = Depends(get_db)
):
    """Initial setup page - only accessible if no users exist"""
    user_count = db.query(User).count()
    if user_count > 0:
        return RedirectResponse(url="/", status_code=302)

    response = templates.TemplateResponse("setup.html", {
        "request": request
    })
    return add_no_cache_headers(response)


@app.get("/login", response_class=HTMLResponse)
async def login_page(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Login page"""
    if current_user:
        return RedirectResponse(url="/dashboard", status_code=302)

    site_config = get_site_config(db)
    response = templates.TemplateResponse("login.html", {
        "request": request,
        "site_config": site_config
    })
    return add_no_cache_headers(response)


@app.get("/register", response_class=HTMLResponse)
async def register_page(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Registration page"""
    if current_user:
        return RedirectResponse(url="/dashboard", status_code=302)

    site_config = get_site_config(db)
    if not site_config.allow_registration:
        return RedirectResponse(url="/login", status_code=302)

    response = templates.TemplateResponse("register.html", {
        "request": request,
        "site_config": site_config
    })
    return add_no_cache_headers(response)


@app.get("/dashboard", response_class=HTMLResponse)
async def dashboard(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """User dashboard"""
    if not current_user:
        return RedirectResponse(url="/login", status_code=302)
    
    site_config = get_site_config(db)
    response = templates.TemplateResponse("dashboard.html", {
        "request": request,
        "site_config": site_config,
        "current_user": current_user
    })
    return add_no_cache_headers(response)


@app.get(f"/{ADMIN_SECRET_PATH}", response_class=HTMLResponse)
async def admin_panel(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Hidden admin panel - URL is configurable via ADMIN_SECRET_PATH"""
    if not current_user:
        return RedirectResponse(url="/login", status_code=302)

    if not current_user.is_admin_or_above():
        return RedirectResponse(url="/dashboard", status_code=302)

    site_config = get_site_config(db)
    response = templates.TemplateResponse("admin/index.html", {
        "request": request,
        "site_config": site_config,
        "current_user": current_user,
        "admin_path": ADMIN_SECRET_PATH
    })
    return add_no_cache_headers(response)


@app.get("/courses", response_class=HTMLResponse)
async def courses_page(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Courses listing page"""
    site_config = get_site_config(db)
    response = templates.TemplateResponse("courses.html", {
        "request": request,
        "site_config": site_config,
        "current_user": current_user
    })
    return add_no_cache_headers(response)


@app.get("/course/{course_id}", response_class=HTMLResponse)
async def course_detail(
    course_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Course detail page"""
    from .models.course import Course

    course = db.query(Course).filter(Course.id == course_id).first()
    if not course or (not course.is_published and (not current_user or not current_user.is_admin_or_above())):
        return RedirectResponse(url="/courses", status_code=302)

    site_config = get_site_config(db)
    response = templates.TemplateResponse("course_detail.html", {
        "request": request,
        "site_config": site_config,
        "current_user": current_user,
        "course": course
    })
    return add_no_cache_headers(response)


# ==================== Custom Pages Route ====================
# This must be at the end to catch any slug not matched by other routes

@app.get("/{page_slug}", response_class=HTMLResponse)
async def custom_page(
    page_slug: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Serve custom pages by slug (e.g., /about, /contact, /privacy)"""
    from .models.site_config import Page

    # Find published page by slug
    page = db.query(Page).filter(
        Page.slug == page_slug,
        Page.is_published == True
    ).first()

    if not page:
        # Return 404 page
        site_config = get_site_config(db)
        response = templates.TemplateResponse("404.html", {
            "request": request,
            "site_config": site_config,
            "current_user": current_user
        }, status_code=404)
        return add_no_cache_headers(response)

    site_config = get_site_config(db)
    response = templates.TemplateResponse("page.html", {
        "request": request,
        "site_config": site_config,
        "current_user": current_user,
        "page": page
    })
    return add_no_cache_headers(response)
