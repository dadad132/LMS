"""
Contact Routes - Handle contact form submissions
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from datetime import datetime

from ..database import get_db
from ..models.contact import ContactInquiry
from .auth import get_admin_user
from ..models.user import User

router = APIRouter(prefix="/api", tags=["Contact"])


# ==================== Pydantic Models ====================

class ContactFormSubmission(BaseModel):
    name: str
    email: str
    phone: Optional[str] = None
    subject: str
    message: str


class ContactInquiryResponse(BaseModel):
    id: int
    name: str
    email: str
    phone: Optional[str]
    subject: str
    message: str
    is_read: bool
    is_replied: bool
    replied_at: Optional[datetime]
    reply_notes: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class ContactInquiryUpdate(BaseModel):
    is_read: Optional[bool] = None
    is_replied: Optional[bool] = None
    reply_notes: Optional[str] = None


# ==================== Public Endpoints ====================

@router.post("/contact")
def submit_contact_form(data: ContactFormSubmission, db: Session = Depends(get_db)):
    """Submit a contact form (public - no auth required)"""
    
    # Create new inquiry
    inquiry = ContactInquiry(
        name=data.name,
        email=data.email,
        phone=data.phone,
        subject=data.subject,
        message=data.message
    )
    
    db.add(inquiry)
    db.commit()
    db.refresh(inquiry)
    
    return {"success": True, "message": "Your message has been sent successfully!"}


# ==================== Admin Endpoints ====================

@router.get("/admin/inquiries")
def list_inquiries(
    skip: int = 0,
    limit: int = 50,
    unread_only: bool = False,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Get all contact inquiries (admin only)"""
    query = db.query(ContactInquiry)
    
    if unread_only:
        query = query.filter(ContactInquiry.is_read == False)
    
    inquiries = query.order_by(ContactInquiry.created_at.desc()).offset(skip).limit(limit).all()
    total = query.count()
    
    return {
        "inquiries": [ContactInquiryResponse.model_validate(i) for i in inquiries],
        "total": total
    }


@router.get("/admin/inquiries/{inquiry_id}")
def get_inquiry(
    inquiry_id: int,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Get a specific inquiry (admin only)"""
    inquiry = db.query(ContactInquiry).filter(ContactInquiry.id == inquiry_id).first()
    if not inquiry:
        raise HTTPException(status_code=404, detail="Inquiry not found")
    
    # Mark as read
    if not inquiry.is_read:
        inquiry.is_read = True
        db.commit()
    
    return ContactInquiryResponse.model_validate(inquiry)


@router.patch("/admin/inquiries/{inquiry_id}")
def update_inquiry(
    inquiry_id: int,
    data: ContactInquiryUpdate,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Update inquiry status (admin only)"""
    inquiry = db.query(ContactInquiry).filter(ContactInquiry.id == inquiry_id).first()
    if not inquiry:
        raise HTTPException(status_code=404, detail="Inquiry not found")
    
    if data.is_read is not None:
        inquiry.is_read = data.is_read
    if data.is_replied is not None:
        inquiry.is_replied = data.is_replied
        if data.is_replied:
            inquiry.replied_at = datetime.utcnow()
    if data.reply_notes is not None:
        inquiry.reply_notes = data.reply_notes
    
    db.commit()
    db.refresh(inquiry)
    
    return ContactInquiryResponse.model_validate(inquiry)


@router.delete("/admin/inquiries/{inquiry_id}")
def delete_inquiry(
    inquiry_id: int,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Delete an inquiry (admin only)"""
    inquiry = db.query(ContactInquiry).filter(ContactInquiry.id == inquiry_id).first()
    if not inquiry:
        raise HTTPException(status_code=404, detail="Inquiry not found")
    
    db.delete(inquiry)
    db.commit()
    
    return {"success": True, "message": "Inquiry deleted"}


@router.get("/admin/inquiries/stats/unread")
def get_unread_count(
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Get count of unread inquiries (admin only)"""
    count = db.query(ContactInquiry).filter(ContactInquiry.is_read == False).count()
    return {"unread_count": count}
