"""
Media Models - Handles file uploads (images, videos, documents)
"""
from sqlalchemy import Column, Integer, String, DateTime, BigInteger, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime

from ..database import Base


class MediaFile(Base):
    """
    Uploaded media files
    """
    __tablename__ = "media_files"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # File info
    filename = Column(String(255), nullable=False)
    original_filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_url = Column(String(500), nullable=False)
    
    # File metadata
    file_type = Column(String(50), nullable=False)  # image, video, document
    mime_type = Column(String(100))
    file_size = Column(BigInteger)  # Size in bytes
    
    # Image-specific
    width = Column(Integer)
    height = Column(Integer)
    
    # Video-specific
    duration_seconds = Column(Integer)
    
    # Organization
    folder = Column(String(255), default="general")
    alt_text = Column(String(255))
    caption = Column(String(500))
    
    # Uploader
    uploaded_by_id = Column(Integer, ForeignKey("users.id"))
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    uploaded_by = relationship("User")
