# LMS Website Builder

A customizable Learning Management System (LMS) with website builder capabilities. Create your own learning platform with full admin control over design, content, and users.

## Features

### 🎨 Website Builder
- **Full Customization**: Change colors, fonts, logos, and layout
- **Widget System**: Add hero sections, text blocks, images, videos, CTAs, and more
- **Custom Pages**: Create unlimited pages with HTML content
- **Landing Page Builder**: Design your first impression for visitors

### 📚 Course Management
- **Create Courses**: Add courses with descriptions, categories, and difficulty levels
- **Lesson System**: Organize content into video, text, or quiz lessons
- **Progress Tracking**: Students can track their learning progress
- **Enrollment System**: Manage who can access your courses

### 👥 User Management
- **Role-Based Access**:
  - **Super Admin**: Full control over everything
  - **Admin**: Manage users and courses
  - **User**: Take courses and track progress
- **Registration Control**: Enable/disable public registration
- **User Profiles**: Avatars, bios, and activity tracking

### 🔒 Security
- **Hidden Admin Panel**: Admin URL is configurable and not discoverable
- **JWT Authentication**: Secure token-based auth
- **Password Hashing**: BCrypt encryption for passwords
- **Role-Based Permissions**: Strict access control

## Quick Start

### 1. Install Dependencies

```bash
cd lms-website-builder
pip install -r requirements.txt
```

### 2. Run the Server

```bash
python run.py
```

### 3. Initial Setup

1. Open http://localhost:8000
2. You'll be redirected to the setup wizard
3. Create your super admin account
4. Configure your site name and colors
5. You're ready to go!

### 4. Access Admin Panel

After setup, access the admin panel at:
```
http://localhost:8000/super-secret-admin-panel-2024
```

**Important**: Change this URL in production! Set the `ADMIN_SECRET_PATH` environment variable.

## Configuration

### Environment Variables

Create a `.env` file in the project root:

```env
# Security
SECRET_KEY=your-super-secret-key-change-this
ADMIN_SECRET_PATH=your-custom-admin-path

# Database (optional, defaults to SQLite)
DATABASE_URL=sqlite:///./data.db
```

### Customizing the Admin Path

The admin panel URL is hidden by default. To change it:

1. Set the `ADMIN_SECRET_PATH` environment variable
2. Or modify `app/config.py`

Example:
```bash
export ADMIN_SECRET_PATH=my-secret-dashboard-xyz123
```

Then access at: `http://localhost:8000/my-secret-dashboard-xyz123`

## Project Structure

```
lms-website-builder/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI application
│   ├── config.py            # Configuration settings
│   ├── database.py          # Database setup
│   ├── api/
│   │   ├── auth.py          # Authentication utilities
│   │   ├── auth_routes.py   # Login/Register endpoints
│   │   ├── admin_routes.py  # Admin API endpoints
│   │   └── course_routes.py # Course API endpoints
│   ├── models/
│   │   ├── user.py          # User model
│   │   ├── site_config.py   # Site settings model
│   │   ├── course.py        # Course/Lesson models
│   │   └── media.py         # Media file model
│   ├── templates/           # Jinja2 HTML templates
│   │   ├── base.html
│   │   ├── index.html
│   │   ├── login.html
│   │   ├── dashboard.html
│   │   └── admin/
│   │       └── index.html
│   └── static/
│       ├── css/
│       └── js/
├── uploads/                  # User uploads
├── requirements.txt
├── run.py
└── README.md
```

## Admin Panel Features

### Dashboard
- Overview statistics
- Recent users
- Quick actions

### Site Settings
- Site name and description
- Logo upload
- Color scheme customization
- Contact information
- Feature toggles (registration, login required)
- Custom CSS

### Pages
- Create custom pages
- HTML content editor
- Set landing page
- Navigation management

### Courses
- Create/edit courses
- Manage lessons
- Track enrollments
- Publish/unpublish

### Users
- View all users
- Create admin users
- Activate/deactivate accounts
- Role management

### Media Library
- Upload images, videos, documents
- Organize in folders
- Copy URLs for use in content

## API Documentation

After starting the server, access:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Deployment

### Production Recommendations

1. **Change Secret Keys**: Update `SECRET_KEY` and `ADMIN_SECRET_PATH`
2. **Use PostgreSQL**: Replace SQLite with a production database
3. **HTTPS**: Always use SSL in production
4. **Reverse Proxy**: Use Nginx or similar
5. **Environment Variables**: Never commit secrets to git

### AlmaLinux / RHEL Deployment

Complete deployment files for AlmaLinux 10 are included in `deploy/almalinux/`:

```bash
# Quick install (as root)
sudo bash deploy/almalinux/install.sh
```

Or follow the manual guide in `deploy/almalinux/README.md`.

**Included files:**
- `install.sh` - Automated installation script
- `lms.service` - Systemd service file
- `nginx-lms.conf` - Nginx configuration
- `README.md` - Detailed deployment guide

### Docker Deployment

Coming soon...

## License

MIT License - Feel free to use for personal or commercial projects.

## Support

For issues or feature requests, please open a GitHub issue.

---

Built with ❤️ using FastAPI, SQLAlchemy, and Jinja2
