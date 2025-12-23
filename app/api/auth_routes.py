"""
Authentication Routes - Login, Register, Token management
"""
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.user import User, UserRole
from ..models.site_config import SiteConfig
from .auth import (
    get_password_hash, create_access_token, authenticate_user,
    get_current_user, get_current_user_required, ACCESS_TOKEN_EXPIRE_MINUTES
)
from ..config import ADMIN_SECRET_PATH

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


# Pydantic models for request/response
class UserCreate(BaseModel):
    email: EmailStr
    username: str
    password: str
    full_name: Optional[str] = None


class UserLogin(BaseModel):
    email: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: int
    email: str
    username: str
    full_name: Optional[str]
    role: str
    is_active: bool
    avatar_url: Optional[str]
    
    class Config:
        from_attributes = True


class SetupRequest(BaseModel):
    """Initial setup request for first admin"""
    email: EmailStr
    username: str
    password: str
    full_name: Optional[str] = None
    site_name: str
    primary_color: Optional[str] = "#3b82f6"


@router.post("/setup", response_model=Token)
async def initial_setup(
    setup_data: SetupRequest,
    response: Response,
    db: Session = Depends(get_db)
):
    """
    Initial site setup - creates the first super admin user and site configuration.
    This endpoint only works when no users exist in the database.
    """
    # Check if setup has already been done
    existing_user = db.query(User).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Setup has already been completed"
        )
    
    # Create super admin user
    hashed_password = get_password_hash(setup_data.password)
    user = User(
        email=setup_data.email,
        username=setup_data.username,
        hashed_password=hashed_password,
        full_name=setup_data.full_name,
        role=UserRole.SUPER_ADMIN,
        is_active=True,
        is_verified=True
    )
    db.add(user)
    db.flush()
    
    # Create site configuration
    site_config = SiteConfig(
        site_name=setup_data.site_name,
        primary_color=setup_data.primary_color,
        is_setup_complete=True
    )
    db.add(site_config)
    
    db.commit()
    db.refresh(user)
    
    # Create access token
    access_token = create_access_token(
        data={"sub": str(user.id), "role": user.role.value}
    )
    
    # Set cookie
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        samesite="lax"
    )
    
    return Token(access_token=access_token)


@router.post("/login", response_model=Token)
async def login(
    login_data: UserLogin,
    response: Response,
    db: Session = Depends(get_db)
):
    """Login with email and password"""
    user = authenticate_user(db, login_data.email, login_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Update last login
    user.last_login = datetime.utcnow()
    db.commit()
    
    # Create access token
    access_token = create_access_token(
        data={"sub": str(user.id), "role": user.role.value}
    )
    
    # Set cookie
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        samesite="lax"
    )
    
    return Token(access_token=access_token)


@router.post("/register", response_model=UserResponse)
async def register(
    user_data: UserCreate,
    db: Session = Depends(get_db)
):
    """Register a new user - DISABLED for public access. Users must be created by admins."""
    # Public registration is disabled - users must be created by admins
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Public registration is disabled. Please contact an administrator to get an account."
    )


@router.post("/logout")
async def logout(response: Response):
    """Logout - clear access token cookie"""
    response.delete_cookie("access_token")
    return {"message": "Successfully logged out"}


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    user: User = Depends(get_current_user_required)
):
    """Get current authenticated user info"""
    return UserResponse(
        id=user.id,
        email=user.email,
        username=user.username,
        full_name=user.full_name,
        role=user.role.value,
        is_active=user.is_active,
        avatar_url=user.avatar_url
    )


@router.get("/check-setup")
async def check_setup_status(db: Session = Depends(get_db)):
    """Check if initial setup has been completed"""
    user_count = db.query(User).count()
    site_config = db.query(SiteConfig).first()
    
    return {
        "setup_required": user_count == 0,
        "setup_complete": site_config.is_setup_complete if site_config else False
    }
