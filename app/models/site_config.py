from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime

from ..database import Base


class SiteConfig(Base):
    """
    Main site configuration - stores all customization settings
    There should only be ONE record in this table
    """
    __tablename__ = "site_config"

    id = Column(Integer, primary_key=True, index=True)

    # Basic Info
    site_name = Column(String(255), default="My Learning Platform")
    site_description = Column(Text)
    site_logo_url = Column(String(500))
    favicon_url = Column(String(500))

    # Color Scheme
    primary_color = Column(String(7), default="#3b82f6")      # Blue
    secondary_color = Column(String(7), default="#10b981")    # Green
    accent_color = Column(String(7), default="#f59e0b")       # Amber
    background_color = Column(String(7), default="#ffffff")   # White
    text_color = Column(String(7), default="#1f2937")         # Dark gray
    header_bg_color = Column(String(7), default="#1f2937")    # Dark gray
    header_text_color = Column(String(7), default="#ffffff")  # White
    footer_bg_color = Column(String(7), default="#111827")    # Darker gray
    footer_text_color = Column(String(7), default="#9ca3af")  # Light gray

    # Typography
    font_family = Column(String(100), default="Inter, sans-serif")
    heading_font_family = Column(String(100), default="Inter, sans-serif")

    # Layout
    header_style = Column(String(50), default="standard")  # standard, centered, minimal
    footer_style = Column(String(50), default="standard")

    # Features toggles
    show_landing_page = Column(Boolean, default=True)
    require_login = Column(Boolean, default=False)
    allow_registration = Column(Boolean, default=True)

    # Contact info (shown in footer)
    contact_email = Column(String(255))
    contact_phone = Column(String(50))
    contact_address = Column(Text)

    # Social links (JSON)
    social_links = Column(JSON, default=dict)  # {"facebook": "url", "twitter": "url", ...}

    # Custom CSS/JS
    custom_css = Column(Text)
    custom_js = Column(Text)

    # SEO
    meta_keywords = Column(Text)
    meta_description = Column(Text)

    # Setup status
    is_setup_complete = Column(Boolean, default=False)

    # ============ HOMEPAGE CONTENT (FULL CONTROL) ============
    # Hero Section
    hero_title = Column(String(255), default="Welcome to Our Learning Platform")
    hero_subtitle = Column(Text, default="Start your learning journey today with our expert-led courses.")
    hero_button_text = Column(String(100), default="Browse Courses")
    hero_button_link = Column(String(255), default="/courses")
    hero_button2_text = Column(String(100), default="Get Started Free")
    hero_button2_link = Column(String(255), default="/register")
    hero_background_image = Column(String(500))
    hero_background_color = Column(String(7))
    hero_style = Column(String(50), default="centered")  # centered, left, right, split

    # Features Section
    features_title = Column(String(255), default="Why Choose Us")
    features_enabled = Column(Boolean, default=True)
    features_items = Column(JSON, default=list)  # [{"icon": "...", "title": "...", "description": "..."}]

    # Featured Courses Section
    courses_section_title = Column(String(255), default="Featured Courses")
    courses_section_enabled = Column(Boolean, default=True)
    courses_max_display = Column(Integer, default=6)

    # CTA Section
    cta_title = Column(String(255), default="Ready to Start Learning?")
    cta_subtitle = Column(Text, default="Join thousands of students already learning on our platform.")
    cta_button_text = Column(String(100), default="Get Started Today")
    cta_button_link = Column(String(255), default="/register")
    cta_enabled = Column(Boolean, default=True)
    cta_background_color = Column(String(7))
    cta_background_image = Column(String(500))

    # Testimonials Section
    testimonials_title = Column(String(255), default="What Our Students Say")
    testimonials_enabled = Column(Boolean, default=False)
    testimonials_items = Column(JSON, default=list)  # [{"name": "...", "text": "...", "role": "...", "image": "..."}]

    # Stats Section
    stats_enabled = Column(Boolean, default=False)
    stats_items = Column(JSON, default=list)  # [{"number": "1000+", "label": "Students"}]

    # Footer Content
    footer_text = Column(Text, default="© 2025 All rights reserved.")
    footer_links = Column(JSON, default=list)  # [{"title": "...", "url": "..."}]

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Page(Base):
    """
    Custom pages that admins can create
    """
    __tablename__ = "pages"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    slug = Column(String(255), unique=True, index=True, nullable=False)
    content = Column(Text)

    # Page type
    page_type = Column(String(50), default="custom")  # landing, about, contact, custom
    is_landing_page = Column(Boolean, default=False)

    # Status
    is_published = Column(Boolean, default=False)
    is_in_navigation = Column(Boolean, default=True)
    navigation_order = Column(Integer, default=0)

    # SEO
    meta_title = Column(String(255))
    meta_description = Column(Text)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    widgets = relationship("PageWidget", back_populates="page", order_by="PageWidget.order")


class Widget(Base):
    """
    Reusable widget templates that can be placed on pages
    """
    __tablename__ = "widgets"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    widget_type = Column(String(50), nullable=False)

    # Default configuration (JSON)
    default_config = Column(JSON, default=dict)

    # Is this a system widget or user-created?
    is_system = Column(Boolean, default=False)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)


class PageWidget(Base):
    """
    Junction table linking widgets to pages with specific configurations
    """
    __tablename__ = "page_widgets"

    id = Column(Integer, primary_key=True, index=True)
    page_id = Column(Integer, ForeignKey("pages.id"), nullable=False)
    widget_id = Column(Integer, ForeignKey("widgets.id"), nullable=False)

    # Position on page
    order = Column(Integer, default=0)
    section = Column(String(50), default="main")

    # Instance-specific configuration (overrides widget defaults)
    config = Column(JSON, default=dict)

    # Visibility
    is_visible = Column(Boolean, default=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    page = relationship("Page", back_populates="widgets")
    widget = relationship("Widget")


class NavigationMenu(Base):
    """
    Custom navigation menu items
    """
    __tablename__ = "navigation_menu"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(100), nullable=False)
    url = Column(String(500))
    page_id = Column(Integer, ForeignKey("pages.id"))

    # Position
    parent_id = Column(Integer, ForeignKey("navigation_menu.id"))
    order = Column(Integer, default=0)

    # Type
    menu_type = Column(String(50), default="header")  # header, footer
    is_dropdown = Column(Boolean, default=False)

    # Visibility
    is_visible = Column(Boolean, default=True)
    requires_login = Column(Boolean, default=False)
