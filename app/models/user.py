"""
User Models - Handles all user types: Super Admin, Admin, and Regular Users
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum as SQLEnum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

from ..database import Base


class UserRole(enum.Enum):
    SUPER_ADMIN = "super_admin"  # Can do everything, first user to set up the site
    ADMIN = "admin"              # Can manage users and courses, help super admin
    USER = "user"                # Regular user taking courses


class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255))
    
    # Role management
    role = Column(SQLEnum(UserRole), default=UserRole.USER, nullable=False)
    
    # Status
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    
    # Profile
    avatar_url = Column(String(500))
    bio = Column(String(1000))
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login = Column(DateTime)
    
    # Relationships
    enrollments = relationship("Enrollment", back_populates="user")
    created_courses = relationship("Course", back_populates="creator")
    
    def is_admin_or_above(self):
        """Check if user has admin privileges"""
        return self.role in [UserRole.SUPER_ADMIN, UserRole.ADMIN]
    
    def is_super_admin(self):
        """Check if user is super admin"""
        return self.role == UserRole.SUPER_ADMIN
