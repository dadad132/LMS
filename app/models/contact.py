from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime
from datetime import datetime

from ..database import Base


class ContactInquiry(Base):
    """
    Stores contact form submissions from visitors
    """
    __tablename__ = "contact_inquiries"

    id = Column(Integer, primary_key=True, index=True)
    
    # Visitor info
    name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False)
    phone = Column(String(50))
    
    # Message details
    subject = Column(String(100), nullable=False)
    message = Column(Text, nullable=False)
    
    # Status tracking
    is_read = Column(Boolean, default=False)
    is_replied = Column(Boolean, default=False)
    replied_at = Column(DateTime)
    reply_notes = Column(Text)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
