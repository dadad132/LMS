"""
Main FastAPI Application
"""
from fastapi import FastAPI, Request, Depends
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse, RedirectResponse
from sqlalchemy.orm import Session
from pathlib import Path

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

# Initialize FastAPI
app = FastAPI(
    title="LMS Website Builder",
    description="A customizable Learning Management System with website builder capabilities",
    version="1.0.0"
)

# Setup templates and static files
BASE_DIR = Path(__file__).resolve().parent
templates = Jinja2Templates(directory=str(BASE_DIR / "templates"))

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
    """Get site configuration or return defaults"""
    config = db.query(SiteConfig).first()
    if config:
        return config
    return SiteConfig()  # Return default config


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
    
    return templates.TemplateResponse("index.html", {
        "request": request,
        "site_config": site_config,
        "current_user": current_user
    })


@app.get("/setup", response_class=HTMLResponse)
async def setup_page(
    request: Request,
    db: Session = Depends(get_db)
):
    """Initial setup page - only accessible if no users exist"""
    user_count = db.query(User).count()
    if user_count > 0:
        return RedirectResponse(url="/", status_code=302)
    
    return templates.TemplateResponse("setup.html", {
        "request": request
    })


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
    return templates.TemplateResponse("login.html", {
        "request": request,
        "site_config": site_config
    })


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
    
    return templates.TemplateResponse("register.html", {
        "request": request,
        "site_config": site_config
    })


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
    return templates.TemplateResponse("dashboard.html", {
        "request": request,
        "site_config": site_config,
        "current_user": current_user
    })


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
    return templates.TemplateResponse("admin/index.html", {
        "request": request,
        "site_config": site_config,
        "current_user": current_user,
        "admin_path": ADMIN_SECRET_PATH
    })


@app.get("/courses", response_class=HTMLResponse)
async def courses_page(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Courses listing page"""
    site_config = get_site_config(db)
    return templates.TemplateResponse("courses.html", {
        "request": request,
        "site_config": site_config,
        "current_user": current_user
    })


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
    return templates.TemplateResponse("course_detail.html", {
        "request": request,
        "site_config": site_config,
        "current_user": current_user,
        "course": course
    })


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
        return templates.TemplateResponse("404.html", {
            "request": request,
            "site_config": site_config,
            "current_user": current_user
        }, status_code=404)
    
    site_config = get_site_config(db)
    return templates.TemplateResponse("page.html", {
        "request": request,
        "site_config": site_config,
        "current_user": current_user,
        "page": page
    })


