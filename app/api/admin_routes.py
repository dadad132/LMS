"""
Admin Routes - Site configuration, user management, and admin-only operations
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.responses import FileResponse
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from datetime import datetime
import shutil
import uuid
import subprocess
import os
import json
import zipfile
from pathlib import Path

from ..database import get_db
from ..models.user import User, UserRole
from ..models.site_config import SiteConfig, Page, Widget, PageWidget, NavigationMenu
from ..models.media import MediaFile
from .auth import get_admin_user, get_super_admin, get_password_hash
from ..config import UPLOAD_DIR, ALLOWED_EXTENSIONS, BASE_DIR

router = APIRouter(prefix="/api/admin", tags=["Admin"])

# Backup directory
BACKUP_DIR = BASE_DIR / "backups"
BACKUP_DIR.mkdir(parents=True, exist_ok=True)


# ==================== Pydantic Models ====================

class SiteConfigUpdate(BaseModel):
    site_name: Optional[str] = None
    site_description: Optional[str] = None
    primary_color: Optional[str] = None
    secondary_color: Optional[str] = None
    accent_color: Optional[str] = None
    background_color: Optional[str] = None
    text_color: Optional[str] = None
    header_bg_color: Optional[str] = None
    header_text_color: Optional[str] = None
    footer_bg_color: Optional[str] = None
    footer_text_color: Optional[str] = None
    font_family: Optional[str] = None
    heading_font_family: Optional[str] = None
    show_landing_page: Optional[bool] = None
    require_login: Optional[bool] = None
    allow_registration: Optional[bool] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_address: Optional[str] = None
    social_links: Optional[dict] = None
    custom_css: Optional[str] = None
    custom_js: Optional[str] = None
    
    # Hero Section
    hero_title: Optional[str] = None
    hero_subtitle: Optional[str] = None
    hero_button_text: Optional[str] = None
    hero_button_link: Optional[str] = None
    hero_button2_text: Optional[str] = None
    hero_button2_link: Optional[str] = None
    hero_background_image: Optional[str] = None
    hero_background_color: Optional[str] = None
    hero_style: Optional[str] = None
    
    # Features Section
    features_title: Optional[str] = None
    features_enabled: Optional[bool] = None
    features_items: Optional[list] = None
    
    # Featured Courses Section
    courses_section_title: Optional[str] = None
    courses_section_enabled: Optional[bool] = None
    courses_max_display: Optional[int] = None
    
    # CTA Section
    cta_title: Optional[str] = None
    cta_subtitle: Optional[str] = None
    cta_button_text: Optional[str] = None
    cta_button_link: Optional[str] = None
    cta_enabled: Optional[bool] = None
    cta_background_color: Optional[str] = None
    cta_background_image: Optional[str] = None
    
    # Testimonials Section
    testimonials_title: Optional[str] = None
    testimonials_enabled: Optional[bool] = None
    testimonials_items: Optional[list] = None
    
    # Stats Section
    stats_enabled: Optional[bool] = None
    stats_items: Optional[list] = None
    
    # Footer
    footer_text: Optional[str] = None
    footer_links: Optional[list] = None
    
    # Custom homepage sections (JSON array of sections)
    homepage_sections: Optional[list] = None
    
    # Gallery images
    gallery_images: Optional[list] = None


class SiteConfigResponse(BaseModel):
    id: int
    site_name: str
    site_description: Optional[str]
    site_logo_url: Optional[str]
    primary_color: str
    secondary_color: str
    accent_color: str
    background_color: str
    text_color: str
    header_bg_color: str
    header_text_color: str
    footer_bg_color: str
    footer_text_color: str
    font_family: str
    show_landing_page: bool
    require_login: bool
    allow_registration: bool
    
    class Config:
        from_attributes = True


class UserCreateAdmin(BaseModel):
    email: EmailStr
    username: str
    password: str
    full_name: Optional[str] = None
    role: str = "user"  # user, admin


class UserUpdateAdmin(BaseModel):
    full_name: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None


class UserListResponse(BaseModel):
    id: int
    email: str
    username: str
    full_name: Optional[str]
    role: str
    is_active: bool
    created_at: datetime
    last_login: Optional[datetime]
    
    class Config:
        from_attributes = True


class PageCreate(BaseModel):
    title: str
    slug: str
    content: Optional[str] = None
    page_type: str = "custom"
    is_landing_page: bool = False
    is_published: bool = False
    is_in_navigation: bool = True
    meta_title: Optional[str] = None
    meta_description: Optional[str] = None


class PageUpdate(BaseModel):
    title: Optional[str] = None
    slug: Optional[str] = None
    content: Optional[str] = None
    is_landing_page: Optional[bool] = None
    is_published: Optional[bool] = None
    is_in_navigation: Optional[bool] = None
    navigation_order: Optional[int] = None
    meta_title: Optional[str] = None
    meta_description: Optional[str] = None


class PageResponse(BaseModel):
    id: int
    title: str
    slug: str
    content: Optional[str]
    page_type: str
    is_landing_page: bool
    is_published: bool
    is_in_navigation: bool
    navigation_order: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class WidgetCreate(BaseModel):
    name: str
    widget_type: str
    default_config: dict = {}


class PageWidgetCreate(BaseModel):
    widget_id: int
    order: int = 0
    section: str = "main"
    config: dict = {}


# ==================== Site Configuration ====================

@router.get("/site-config")
async def get_site_config(
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Get current site configuration with all homepage fields"""
    # Force fresh query from database
    db.expire_all()
    
    config = db.query(SiteConfig).first()
    if not config:
        raise HTTPException(status_code=404, detail="Site configuration not found")
    
    # Refresh to ensure we have latest data
    db.refresh(config)
    
    # Return all fields including homepage customization
    return {
        "id": config.id,
        "site_name": config.site_name,
        "site_description": config.site_description,
        "site_logo_url": config.site_logo_url,
        "favicon_url": config.favicon_url,
        "primary_color": config.primary_color,
        "secondary_color": config.secondary_color,
        "accent_color": config.accent_color,
        "background_color": config.background_color,
        "text_color": config.text_color,
        "header_bg_color": config.header_bg_color,
        "header_text_color": config.header_text_color,
        "footer_bg_color": config.footer_bg_color,
        "footer_text_color": config.footer_text_color,
        "font_family": config.font_family,
        "heading_font_family": config.heading_font_family,
        "show_landing_page": config.show_landing_page,
        "require_login": config.require_login,
        "allow_registration": config.allow_registration,
        "contact_email": config.contact_email,
        "contact_phone": config.contact_phone,
        "contact_address": config.contact_address,
        "social_links": config.social_links or {},
        "custom_css": config.custom_css,
        "custom_js": config.custom_js,
        # Hero Section
        "hero_title": config.hero_title,
        "hero_subtitle": config.hero_subtitle,
        "hero_button_text": config.hero_button_text,
        "hero_button_link": config.hero_button_link,
        "hero_button2_text": config.hero_button2_text,
        "hero_button2_link": config.hero_button2_link,
        "hero_background_image": config.hero_background_image,
        "hero_background_color": config.hero_background_color,
        "hero_style": config.hero_style,
        # Features Section
        "features_title": config.features_title,
        "features_enabled": config.features_enabled,
        "features_items": config.features_items or [],
        # Courses Section
        "courses_section_title": config.courses_section_title,
        "courses_section_enabled": config.courses_section_enabled,
        "courses_max_display": config.courses_max_display,
        # CTA Section
        "cta_title": config.cta_title,
        "cta_subtitle": config.cta_subtitle,
        "cta_button_text": config.cta_button_text,
        "cta_button_link": config.cta_button_link,
        "cta_enabled": config.cta_enabled,
        "cta_background_color": config.cta_background_color,
        "cta_background_image": config.cta_background_image,
        # Testimonials
        "testimonials_title": config.testimonials_title,
        "testimonials_enabled": config.testimonials_enabled,
        "testimonials_items": config.testimonials_items or [],
        # Stats
        "stats_enabled": config.stats_enabled,
        "stats_items": config.stats_items or [],
        # Footer
        "footer_text": config.footer_text,
        "footer_links": config.footer_links or [],
        # Custom sections
        "homepage_sections": config.homepage_sections or [],
        "gallery_images": config.gallery_images or []
    }


@router.put("/site-config")
async def update_site_config(
    config_update: SiteConfigUpdate,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Update site configuration"""
    from sqlalchemy.orm.attributes import flag_modified
    
    # Expire any cached data first
    db.expire_all()
    
    config = db.query(SiteConfig).first()
    if not config:
        config = SiteConfig()
        db.add(config)
        db.flush()  # Ensure the config gets an ID
    
    # Update fields
    update_data = config_update.model_dump(exclude_unset=True)
    
    # JSON fields that need explicit modification flagging
    json_fields = {'features_items', 'testimonials_items', 'stats_items', 
                   'footer_links', 'homepage_sections', 'gallery_images', 'social_links'}
    
    for field, value in update_data.items():
        if hasattr(config, field):
            setattr(config, field, value)
            # Flag JSON fields as modified to ensure SQLAlchemy detects the change
            if field in json_fields:
                flag_modified(config, field)
    
    config.updated_at = datetime.utcnow()
    
    # Commit and refresh to ensure changes are persisted
    db.commit()
    db.refresh(config)
    
    return {"message": "Site configuration updated successfully", "updated_at": str(config.updated_at)}


@router.post("/site-config/hero-image")
async def upload_hero_image(
    file: UploadFile = File(...),
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Upload hero background image"""
    ext = f".{file.filename.split('.')[-1].lower()}"
    if ext not in ALLOWED_EXTENSIONS['images']:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed: {ALLOWED_EXTENSIONS['images']}"
        )
    
    filename = f"hero_{uuid.uuid4().hex}{ext}"
    file_path = UPLOAD_DIR / "site" / filename
    file_path.parent.mkdir(parents=True, exist_ok=True)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    config = db.query(SiteConfig).first()
    if config:
        config.hero_background_image = f"/uploads/site/{filename}"
        db.commit()
    
    return {"url": f"/uploads/site/{filename}"}


@router.post("/site-config/cta-image")
async def upload_cta_image(
    file: UploadFile = File(...),
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Upload CTA section background image"""
    ext = f".{file.filename.split('.')[-1].lower()}"
    if ext not in ALLOWED_EXTENSIONS['images']:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed: {ALLOWED_EXTENSIONS['images']}"
        )
    
    filename = f"cta_{uuid.uuid4().hex}{ext}"
    file_path = UPLOAD_DIR / "site" / filename
    file_path.parent.mkdir(parents=True, exist_ok=True)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    config = db.query(SiteConfig).first()
    if config:
        config.cta_background_image = f"/uploads/site/{filename}"
        db.commit()
    
    return {"url": f"/uploads/site/{filename}"}


@router.post("/site-config/logo")
async def upload_site_logo(
    file: UploadFile = File(...),
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Upload site logo"""
    # Validate file type
    ext = f".{file.filename.split('.')[-1].lower()}"
    if ext not in ALLOWED_EXTENSIONS['images']:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed: {ALLOWED_EXTENSIONS['images']}"
        )
    
    # Generate unique filename
    filename = f"logo_{uuid.uuid4().hex}{ext}"
    file_path = UPLOAD_DIR / "site" / filename
    file_path.parent.mkdir(parents=True, exist_ok=True)
    
    # Save file
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Update site config
    config = db.query(SiteConfig).first()
    if config:
        config.site_logo_url = f"/uploads/site/{filename}"
        db.commit()
    
    return {"url": f"/uploads/site/{filename}"}


# ==================== User Management ====================

@router.get("/users", response_model=List[UserListResponse])
async def list_users(
    skip: int = 0,
    limit: int = 50,
    role: Optional[str] = None,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """List all users (admin only)"""
    query = db.query(User)
    
    if role:
        query = query.filter(User.role == UserRole(role))
    
    users = query.offset(skip).limit(limit).all()
    return [
        UserListResponse(
            id=u.id,
            email=u.email,
            username=u.username,
            full_name=u.full_name,
            role=u.role.value,
            is_active=u.is_active,
            created_at=u.created_at,
            last_login=u.last_login
        )
        for u in users
    ]


@router.post("/users", response_model=UserListResponse)
async def create_user_admin(
    user_data: UserCreateAdmin,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Create a new user (admin only)"""
    # Check if email exists
    if db.query(User).filter(User.email == user_data.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Check if username exists
    if db.query(User).filter(User.username == user_data.username).first():
        raise HTTPException(status_code=400, detail="Username already taken")
    
    # Only super admin can create other admins
    if user_data.role == "admin" and not admin.is_super_admin():
        raise HTTPException(
            status_code=403,
            detail="Only super admin can create admin users"
        )
    
    # Create user
    role = UserRole.ADMIN if user_data.role == "admin" else UserRole.USER
    user = User(
        email=user_data.email,
        username=user_data.username,
        hashed_password=get_password_hash(user_data.password),
        full_name=user_data.full_name,
        role=role,
        is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    return UserListResponse(
        id=user.id,
        email=user.email,
        username=user.username,
        full_name=user.full_name,
        role=user.role.value,
        is_active=user.is_active,
        created_at=user.created_at,
        last_login=user.last_login
    )


@router.put("/users/{user_id}", response_model=UserListResponse)
async def update_user_admin(
    user_id: int,
    user_update: UserUpdateAdmin,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Update a user (admin only)"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Cannot modify super admin unless you are super admin
    if user.is_super_admin() and not admin.is_super_admin():
        raise HTTPException(status_code=403, detail="Cannot modify super admin")
    
    # Only super admin can change roles to admin
    if user_update.role == "admin" and not admin.is_super_admin():
        raise HTTPException(status_code=403, detail="Only super admin can assign admin role")
    
    # Update fields
    if user_update.full_name is not None:
        user.full_name = user_update.full_name
    if user_update.is_active is not None:
        user.is_active = user_update.is_active
    if user_update.role is not None:
        user.role = UserRole(user_update.role)
    
    user.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(user)
    
    return UserListResponse(
        id=user.id,
        email=user.email,
        username=user.username,
        full_name=user.full_name,
        role=user.role.value,
        is_active=user.is_active,
        created_at=user.created_at,
        last_login=user.last_login
    )


@router.delete("/users/{user_id}")
async def delete_user_admin(
    user_id: int,
    admin: User = Depends(get_super_admin),
    db: Session = Depends(get_db)
):
    """Delete a user (super admin only)"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.is_super_admin():
        raise HTTPException(status_code=403, detail="Cannot delete super admin")
    
    db.delete(user)
    db.commit()
    
    return {"message": "User deleted successfully"}


# ==================== Page Management ====================

@router.get("/pages", response_model=List[PageResponse])
async def list_pages(
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """List all pages"""
    pages = db.query(Page).order_by(Page.navigation_order).all()
    return pages


@router.post("/pages", response_model=PageResponse)
async def create_page(
    page_data: PageCreate,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Create a new page"""
    # Check if slug exists
    if db.query(Page).filter(Page.slug == page_data.slug).first():
        raise HTTPException(status_code=400, detail="Page with this slug already exists")
    
    # If setting as landing page, unset any existing landing page
    if page_data.is_landing_page:
        db.query(Page).filter(Page.is_landing_page == True).update({"is_landing_page": False})
    
    page = Page(**page_data.model_dump())
    db.add(page)
    db.commit()
    db.refresh(page)
    
    return page


@router.put("/pages/{page_id}", response_model=PageResponse)
async def update_page(
    page_id: int,
    page_update: PageUpdate,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Update a page"""
    page = db.query(Page).filter(Page.id == page_id).first()
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    
    # If setting as landing page, unset any existing landing page
    if page_update.is_landing_page:
        db.query(Page).filter(Page.is_landing_page == True, Page.id != page_id).update({"is_landing_page": False})
    
    update_data = page_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(page, field, value)
    
    page.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(page)
    
    return page


@router.delete("/pages/{page_id}")
async def delete_page(
    page_id: int,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Delete a page"""
    page = db.query(Page).filter(Page.id == page_id).first()
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    
    db.delete(page)
    db.commit()
    
    return {"message": "Page deleted successfully"}


# ==================== Widget Management ====================

@router.get("/widgets")
async def list_widgets(
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """List all available widgets"""
    widgets = db.query(Widget).all()
    return widgets


@router.post("/pages/{page_id}/widgets")
async def add_widget_to_page(
    page_id: int,
    widget_data: PageWidgetCreate,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Add a widget to a page"""
    page = db.query(Page).filter(Page.id == page_id).first()
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    
    widget = db.query(Widget).filter(Widget.id == widget_data.widget_id).first()
    if not widget:
        raise HTTPException(status_code=404, detail="Widget not found")
    
    page_widget = PageWidget(
        page_id=page_id,
        widget_id=widget_data.widget_id,
        order=widget_data.order,
        section=widget_data.section,
        config=widget_data.config
    )
    db.add(page_widget)
    db.commit()
    db.refresh(page_widget)
    
    return page_widget


# ==================== File Upload ====================

@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    folder: str = "general",
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Upload a file (image, video, or document)"""
    ext = f".{file.filename.split('.')[-1].lower()}"
    
    # Determine file type
    file_type = None
    for ftype, extensions in ALLOWED_EXTENSIONS.items():
        if ext in extensions:
            file_type = ftype.rstrip('s')  # images -> image
            break
    
    if not file_type:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed extensions: {ALLOWED_EXTENSIONS}"
        )
    
    # Generate unique filename
    filename = f"{uuid.uuid4().hex}{ext}"
    file_path = UPLOAD_DIR / folder / filename
    file_path.parent.mkdir(parents=True, exist_ok=True)
    
    # Save file
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Get file size
    file_size = file_path.stat().st_size
    
    # Create media file record
    media_file = MediaFile(
        filename=filename,
        original_filename=file.filename,
        file_path=str(file_path),
        file_url=f"/uploads/{folder}/{filename}",
        file_type=file_type,
        mime_type=file.content_type,
        file_size=file_size,
        folder=folder,
        uploaded_by_id=admin.id
    )
    db.add(media_file)
    db.commit()
    db.refresh(media_file)
    
    return {
        "id": media_file.id,
        "url": media_file.file_url,
        "filename": media_file.original_filename,
        "file_type": media_file.file_type,
        "file_size": media_file.file_size
    }


@router.get("/media")
async def list_media(
    file_type: Optional[str] = None,
    folder: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """List all uploaded media files"""
    query = db.query(MediaFile)
    
    if file_type:
        query = query.filter(MediaFile.file_type == file_type)
    if folder:
        query = query.filter(MediaFile.folder == folder)
    
    files = query.order_by(MediaFile.created_at.desc()).offset(skip).limit(limit).all()
    
    return [
        {
            "id": f.id,
            "url": f.file_url,
            "filename": f.original_filename,
            "file_type": f.file_type,
            "file_size": f.file_size,
            "created_at": f.created_at
        }
        for f in files
    ]


# ==================== System Update ====================

@router.post("/system/update")
async def update_system(
    admin: User = Depends(get_super_admin)
):
    """
    Pull latest code from GitHub and restart the application.
    Only super admin can perform this action.
    """
    try:
        # Change to the project directory
        project_dir = str(BASE_DIR)
        
        # Run git pull
        result = subprocess.run(
            ["git", "pull", "origin", "main"],
            cwd=project_dir,
            capture_output=True,
            text=True,
            timeout=60
        )
        
        if result.returncode != 0:
            return {
                "success": False,
                "message": "Git pull failed",
                "error": result.stderr,
                "output": result.stdout
            }
        
        # Check if there were any updates
        if "Already up to date" in result.stdout:
            return {
                "success": True,
                "message": "Already up to date. No changes to pull.",
                "output": result.stdout
            }
        
        return {
            "success": True,
            "message": "Update successful! Please restart the server for changes to take effect.",
            "output": result.stdout,
            "requires_restart": True
        }
        
    except subprocess.TimeoutExpired:
        return {
            "success": False,
            "message": "Update timed out. Please try again.",
            "error": "Git pull operation timed out after 60 seconds"
        }
    except Exception as e:
        return {
            "success": False,
            "message": "Update failed",
            "error": str(e)
        }


@router.get("/system/version")
async def get_system_version(
    admin: User = Depends(get_admin_user)
):
    """Get current git commit info"""
    try:
        project_dir = str(BASE_DIR)
        
        # Get current commit hash
        commit_result = subprocess.run(
            ["git", "rev-parse", "--short", "HEAD"],
            cwd=project_dir,
            capture_output=True,
            text=True
        )
        
        # Get commit date
        date_result = subprocess.run(
            ["git", "log", "-1", "--format=%ci"],
            cwd=project_dir,
            capture_output=True,
            text=True
        )
        
        # Check for updates
        subprocess.run(["git", "fetch", "origin"], cwd=project_dir, capture_output=True)
        
        behind_result = subprocess.run(
            ["git", "rev-list", "--count", "HEAD..origin/main"],
            cwd=project_dir,
            capture_output=True,
            text=True
        )
        
        commits_behind = int(behind_result.stdout.strip()) if behind_result.returncode == 0 else 0
        
        return {
            "commit": commit_result.stdout.strip(),
            "date": date_result.stdout.strip(),
            "updates_available": commits_behind > 0,
            "commits_behind": commits_behind
        }
    except Exception as e:
        return {
            "commit": "unknown",
            "date": "unknown",
            "updates_available": False,
            "error": str(e)
        }


# ==================== Backup & Restore ====================

@router.post("/backup/create")
async def create_backup(
    admin: User = Depends(get_super_admin),
    db: Session = Depends(get_db)
):
    """
    Create a complete backup of the website including database and uploaded files.
    Only super admin can perform this action.
    """
    try:
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        backup_name = f"backup_{timestamp}"
        backup_path = BACKUP_DIR / backup_name
        backup_path.mkdir(parents=True, exist_ok=True)
        
        # 1. Export site configuration
        config = db.query(SiteConfig).first()
        if config:
            config_data = {
                "site_name": config.site_name,
                "site_description": config.site_description,
                "site_logo_url": config.site_logo_url,
                "favicon_url": config.favicon_url,
                "primary_color": config.primary_color,
                "secondary_color": config.secondary_color,
                "accent_color": config.accent_color,
                "background_color": config.background_color,
                "text_color": config.text_color,
                "header_bg_color": config.header_bg_color,
                "header_text_color": config.header_text_color,
                "footer_bg_color": config.footer_bg_color,
                "footer_text_color": config.footer_text_color,
                "font_family": config.font_family,
                "heading_font_family": config.heading_font_family,
                "show_landing_page": config.show_landing_page,
                "require_login": config.require_login,
                "allow_registration": config.allow_registration,
                "contact_email": config.contact_email,
                "contact_phone": config.contact_phone,
                "contact_address": config.contact_address,
                "social_links": config.social_links,
                "custom_css": config.custom_css,
                "custom_js": config.custom_js,
                "hero_title": config.hero_title,
                "hero_subtitle": config.hero_subtitle,
                "hero_button_text": config.hero_button_text,
                "hero_button_link": config.hero_button_link,
                "hero_button2_text": config.hero_button2_text,
                "hero_button2_link": config.hero_button2_link,
                "hero_background_image": config.hero_background_image,
                "hero_background_color": config.hero_background_color,
                "hero_style": config.hero_style,
                "features_title": config.features_title,
                "features_enabled": config.features_enabled,
                "features_items": config.features_items,
                "courses_section_title": config.courses_section_title,
                "courses_section_enabled": config.courses_section_enabled,
                "courses_max_display": config.courses_max_display,
                "cta_title": config.cta_title,
                "cta_subtitle": config.cta_subtitle,
                "cta_button_text": config.cta_button_text,
                "cta_button_link": config.cta_button_link,
                "cta_enabled": config.cta_enabled,
                "cta_background_color": config.cta_background_color,
                "cta_background_image": config.cta_background_image,
                "testimonials_title": config.testimonials_title,
                "testimonials_enabled": config.testimonials_enabled,
                "testimonials_items": config.testimonials_items,
                "stats_enabled": config.stats_enabled,
                "stats_items": config.stats_items,
                "footer_text": config.footer_text,
                "footer_links": config.footer_links,
                "homepage_sections": config.homepage_sections,
                "gallery_images": config.gallery_images,
            }
            with open(backup_path / "site_config.json", "w", encoding="utf-8") as f:
                json.dump(config_data, f, indent=2, ensure_ascii=False, default=str)
        
        # 2. Export pages
        pages = db.query(Page).all()
        pages_data = []
        for page in pages:
            pages_data.append({
                "title": page.title,
                "slug": page.slug,
                "content": page.content,
                "page_type": page.page_type,
                "is_landing_page": page.is_landing_page,
                "is_published": page.is_published,
                "is_in_navigation": page.is_in_navigation,
                "navigation_order": page.navigation_order,
                "meta_title": page.meta_title,
                "meta_description": page.meta_description,
            })
        with open(backup_path / "pages.json", "w", encoding="utf-8") as f:
            json.dump(pages_data, f, indent=2, ensure_ascii=False)
        
        # 3. Copy database file
        db_path = BASE_DIR / "data.db"
        if db_path.exists():
            shutil.copy2(db_path, backup_path / "data.db")
        
        # 4. Copy uploaded files
        uploads_backup = backup_path / "uploads"
        if UPLOAD_DIR.exists():
            shutil.copytree(UPLOAD_DIR, uploads_backup, dirs_exist_ok=True)
        
        # 5. Create ZIP archive
        zip_path = BACKUP_DIR / f"{backup_name}.zip"
        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for root, dirs, files in os.walk(backup_path):
                for file in files:
                    file_path = Path(root) / file
                    arcname = file_path.relative_to(backup_path)
                    zipf.write(file_path, arcname)
        
        # Clean up unzipped backup folder
        shutil.rmtree(backup_path)
        
        # Get file size
        file_size = zip_path.stat().st_size
        
        return {
            "success": True,
            "message": "Backup created successfully!",
            "backup_name": f"{backup_name}.zip",
            "file_size": file_size,
            "download_url": f"/api/admin/backup/download/{backup_name}.zip"
        }
        
    except Exception as e:
        return {
            "success": False,
            "message": "Backup failed",
            "error": str(e)
        }


@router.get("/backup/download/{backup_name}")
async def download_backup(
    backup_name: str,
    admin: User = Depends(get_super_admin)
):
    """Download a backup file"""
    backup_path = BACKUP_DIR / backup_name
    
    if not backup_path.exists():
        raise HTTPException(status_code=404, detail="Backup not found")
    
    return FileResponse(
        path=backup_path,
        filename=backup_name,
        media_type="application/zip"
    )


@router.get("/backup/list")
async def list_backups(
    admin: User = Depends(get_super_admin)
):
    """List all available backups"""
    backups = []
    
    if BACKUP_DIR.exists():
        for file in sorted(BACKUP_DIR.glob("*.zip"), reverse=True):
            stat = file.stat()
            backups.append({
                "name": file.name,
                "size": stat.st_size,
                "created": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                "download_url": f"/api/admin/backup/download/{file.name}"
            })
    
    return backups


@router.delete("/backup/{backup_name}")
async def delete_backup(
    backup_name: str,
    admin: User = Depends(get_super_admin)
):
    """Delete a backup file"""
    backup_path = BACKUP_DIR / backup_name
    
    if not backup_path.exists():
        raise HTTPException(status_code=404, detail="Backup not found")
    
    backup_path.unlink()
    return {"success": True, "message": "Backup deleted"}


@router.post("/backup/restore")
async def restore_backup(
    file: UploadFile = File(...),
    admin: User = Depends(get_super_admin),
    db: Session = Depends(get_db)
):
    """
    Restore website from a backup ZIP file.
    This will overwrite current site configuration and uploaded files.
    """
    try:
        # Save uploaded file
        temp_zip = BACKUP_DIR / f"restore_temp_{uuid.uuid4().hex}.zip"
        with open(temp_zip, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Extract to temp directory
        extract_dir = BACKUP_DIR / f"restore_temp_{uuid.uuid4().hex}"
        with zipfile.ZipFile(temp_zip, 'r') as zipf:
            zipf.extractall(extract_dir)
        
        restored_items = []
        
        # 1. Restore site configuration
        config_file = extract_dir / "site_config.json"
        if config_file.exists():
            with open(config_file, "r", encoding="utf-8") as f:
                config_data = json.load(f)
            
            config = db.query(SiteConfig).first()
            if not config:
                config = SiteConfig()
                db.add(config)
            
            for key, value in config_data.items():
                if hasattr(config, key):
                    setattr(config, key, value)
            
            db.commit()
            restored_items.append("Site configuration")
        
        # 2. Restore pages
        pages_file = extract_dir / "pages.json"
        if pages_file.exists():
            with open(pages_file, "r", encoding="utf-8") as f:
                pages_data = json.load(f)
            
            for page_data in pages_data:
                existing_page = db.query(Page).filter(Page.slug == page_data["slug"]).first()
                if existing_page:
                    for key, value in page_data.items():
                        setattr(existing_page, key, value)
                else:
                    new_page = Page(**page_data)
                    db.add(new_page)
            
            db.commit()
            restored_items.append(f"{len(pages_data)} pages")
        
        # 3. Restore uploaded files
        uploads_backup = extract_dir / "uploads"
        if uploads_backup.exists():
            # Backup current uploads first
            if UPLOAD_DIR.exists():
                current_backup = BACKUP_DIR / f"pre_restore_uploads_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"
                shutil.copytree(UPLOAD_DIR, current_backup)
            
            # Copy restored uploads
            shutil.copytree(uploads_backup, UPLOAD_DIR, dirs_exist_ok=True)
            restored_items.append("Uploaded files")
        
        # Clean up temp files
        temp_zip.unlink()
        shutil.rmtree(extract_dir)
        
        return {
            "success": True,
            "message": "Backup restored successfully!",
            "restored_items": restored_items
        }
        
    except Exception as e:
        # Clean up on error
        if 'temp_zip' in locals() and temp_zip.exists():
            temp_zip.unlink()
        if 'extract_dir' in locals() and extract_dir.exists():
            shutil.rmtree(extract_dir)
        
        return {
            "success": False,
            "message": "Restore failed",
            "error": str(e)
        }