"""
Script to create default pages (About, Contact) if they don't exist.
Run this once to set up the pages.
"""
import sys
sys.path.insert(0, '.')

from app.database import SessionLocal
from app.models.site_config import Page

db = SessionLocal()

try:
    # Check for existing pages
    about_page = db.query(Page).filter(Page.slug == "about").first()
    contact_page = db.query(Page).filter(Page.slug == "contact").first()
    privacy_page = db.query(Page).filter(Page.slug == "privacy").first()
    terms_page = db.query(Page).filter(Page.slug == "terms").first()
    
    created = []
    
    if not about_page:
        about_page = Page(
            title="About Us",
            slug="about",
            content="""
<div class="about-page">
    <h1>About Us</h1>
    <p>Welcome to our learning platform! We are dedicated to providing high-quality online education to learners worldwide.</p>
    
    <h2>Our Mission</h2>
    <p>Our mission is to make quality education accessible to everyone, anywhere, anytime. We believe that learning should be engaging, interactive, and tailored to individual needs.</p>
    
    <h2>What We Offer</h2>
    <ul>
        <li>Expert-led courses across various subjects</li>
        <li>Interactive learning experiences</li>
        <li>Self-paced learning options</li>
        <li>Certificates upon completion</li>
        <li>Community support and networking</li>
    </ul>
    
    <h2>Our Team</h2>
    <p>We are a passionate team of educators, technologists, and lifelong learners committed to transforming the way people learn online.</p>
</div>
            """,
            page_type="standard",
            is_published=True,
            is_in_navigation=True,
            navigation_order=1,
            meta_title="About Us",
            meta_description="Learn more about our learning platform and mission."
        )
        db.add(about_page)
        created.append("About Us")
    
    if not contact_page:
        contact_page = Page(
            title="Contact Us",
            slug="contact",
            content="""
<div class="contact-page">
    <h1>Contact Us</h1>
    <p>We'd love to hear from you! Whether you have a question, feedback, or need assistance, feel free to reach out.</p>
    
    <div class="contact-info">
        <h2>Get in Touch</h2>
        <p><strong>Email:</strong> support@example.com</p>
        <p><strong>Phone:</strong> +1 (555) 123-4567</p>
        <p><strong>Address:</strong> 123 Learning Street, Education City, EC 12345</p>
    </div>
    
    <div class="contact-form-section">
        <h2>Send Us a Message</h2>
        <form id="contactForm" onsubmit="submitContactForm(event)">
            <div class="form-group">
                <label for="name">Your Name</label>
                <input type="text" id="name" name="name" required>
            </div>
            <div class="form-group">
                <label for="email">Your Email</label>
                <input type="email" id="email" name="email" required>
            </div>
            <div class="form-group">
                <label for="subject">Subject</label>
                <input type="text" id="subject" name="subject" required>
            </div>
            <div class="form-group">
                <label for="message">Message</label>
                <textarea id="message" name="message" rows="5" required></textarea>
            </div>
            <button type="submit" class="btn btn-primary">Send Message</button>
        </form>
        <div id="contactFormResult" style="margin-top: 1rem;"></div>
    </div>
</div>

<script>
async function submitContactForm(e) {
    e.preventDefault();
    const form = e.target;
    const result = document.getElementById('contactFormResult');
    
    const data = {
        name: form.name.value,
        email: form.email.value,
        subject: form.subject.value,
        message: form.message.value
    };
    
    try {
        const response = await fetch('/api/contact', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            result.innerHTML = '<div class="alert alert-success">Thank you! Your message has been sent successfully.</div>';
            form.reset();
        } else {
            result.innerHTML = '<div class="alert alert-error">Failed to send message. Please try again.</div>';
        }
    } catch (error) {
        result.innerHTML = '<div class="alert alert-error">An error occurred. Please try again later.</div>';
    }
}
</script>
            """,
            page_type="standard",
            is_published=True,
            is_in_navigation=True,
            navigation_order=2,
            meta_title="Contact Us",
            meta_description="Get in touch with us. We're here to help!"
        )
        db.add(contact_page)
        created.append("Contact Us")
    
    if not privacy_page:
        privacy_page = Page(
            title="Privacy Policy",
            slug="privacy",
            content="""
<div class="privacy-page">
    <h1>Privacy Policy</h1>
    <p><em>Last updated: December 2024</em></p>
    
    <h2>Information We Collect</h2>
    <p>We collect information you provide directly to us, such as when you create an account, enroll in a course, or contact us for support.</p>
    
    <h2>How We Use Your Information</h2>
    <p>We use the information we collect to provide, maintain, and improve our services, process transactions, and communicate with you.</p>
    
    <h2>Information Sharing</h2>
    <p>We do not sell, trade, or otherwise transfer your personal information to outside parties except as described in this policy.</p>
    
    <h2>Data Security</h2>
    <p>We implement appropriate security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.</p>
    
    <h2>Contact Us</h2>
    <p>If you have questions about this Privacy Policy, please contact us at privacy@example.com.</p>
</div>
            """,
            page_type="standard",
            is_published=True,
            is_in_navigation=False,
            navigation_order=99,
            meta_title="Privacy Policy",
            meta_description="Our privacy policy explains how we handle your data."
        )
        db.add(privacy_page)
        created.append("Privacy Policy")
    
    if not terms_page:
        terms_page = Page(
            title="Terms of Service",
            slug="terms",
            content="""
<div class="terms-page">
    <h1>Terms of Service</h1>
    <p><em>Last updated: December 2024</em></p>
    
    <h2>Acceptance of Terms</h2>
    <p>By accessing and using this platform, you accept and agree to be bound by the terms and provisions of this agreement.</p>
    
    <h2>Use License</h2>
    <p>Permission is granted to temporarily access the materials on our platform for personal, non-commercial transitory viewing only.</p>
    
    <h2>User Accounts</h2>
    <p>You are responsible for maintaining the confidentiality of your account and password and for restricting access to your computer.</p>
    
    <h2>Course Content</h2>
    <p>All course content is protected by copyright and other intellectual property laws. You may not reproduce, distribute, or create derivative works without permission.</p>
    
    <h2>Limitation of Liability</h2>
    <p>We shall not be liable for any damages arising from the use or inability to use our services.</p>
    
    <h2>Contact</h2>
    <p>For questions about these terms, please contact us at legal@example.com.</p>
</div>
            """,
            page_type="standard",
            is_published=True,
            is_in_navigation=False,
            navigation_order=99,
            meta_title="Terms of Service",
            meta_description="Terms and conditions for using our platform."
        )
        db.add(terms_page)
        created.append("Terms of Service")
    
    if created:
        db.commit()
        print(f"✅ Created pages: {', '.join(created)}")
    else:
        print("✅ All default pages already exist.")
    
    # List all pages
    all_pages = db.query(Page).all()
    print(f"\n📄 All pages in database ({len(all_pages)}):")
    for page in all_pages:
        status = "✅ Published" if page.is_published else "❌ Draft"
        nav = "📍 In Nav" if page.is_in_navigation else ""
        print(f"  - {page.title} (/{page.slug}) - {status} {nav}")

except Exception as e:
    print(f"❌ Error: {e}")
    db.rollback()
finally:
    db.close()
