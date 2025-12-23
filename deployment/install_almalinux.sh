#!/bin/bash

###############################################################################
# LMS Website Builder - AlmaLinux/RHEL Automatic Installer
# This script will install and configure the LMS website on AlmaLinux/CentOS/RHEL
###############################################################################

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}   LMS Website Builder - AlmaLinux Installer${NC}"
echo -e "${BLUE}=========================================${NC}\n"

# Function to print status messages
print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_info() {
    echo -e "${YELLOW}[i]${NC} $1"
}

# Configuration
APP_NAME="lms-website"
SERVICE_NAME="lms-website"
PORT=8001
GITHUB_REPO="https://github.com/dadad132/LMS.git"

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    print_error "Please run as root (use sudo)"
    exit 1
fi

APP_DIR="/opt/$APP_NAME"
SERVICE_USER="lms"

print_info "Installation directory: $APP_DIR"
print_info "Service will run as: $SERVICE_USER"
print_info "Port: $PORT"
print_info "GitHub Repo: $GITHUB_REPO"
print_info "Starting installation process..."

# Update system packages
print_info "Updating system packages..."
dnf update -y
print_status "System packages updated"

# Install EPEL repository (for additional packages)
print_info "Installing EPEL repository..."
dnf install -y epel-release
print_status "EPEL repository installed"

# Install Python 3.11+ and required system dependencies
print_info "Installing Python and system dependencies..."
dnf install -y \
    python3 \
    python3-pip \
    python3-devel \
    gcc \
    git \
    curl \
    sqlite \
    unzip
print_status "Dependencies installed"

# Check Python version
PYTHON_VERSION=$(python3 --version | cut -d' ' -f2 | cut -d'.' -f1,2)
print_info "Python version: $PYTHON_VERSION"

# Create service user
if ! id "$SERVICE_USER" &>/dev/null; then
    print_info "Creating $SERVICE_USER user..."
    useradd -r -s /sbin/nologin -d "$APP_DIR" "$SERVICE_USER"
    print_status "User '$SERVICE_USER' created"
else
    print_info "User '$SERVICE_USER' already exists"
fi

# Create application directory if it doesn't exist
if [ -d "$APP_DIR" ]; then
    print_info "Application directory already exists at $APP_DIR"
    read -p "Do you want to backup and reinstall? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_info "Backing up existing installation..."
        BACKUP_DIR="${APP_DIR}_backup_$(date +%Y%m%d_%H%M%S)"
        mv "$APP_DIR" "$BACKUP_DIR"
        print_status "Existing installation backed up to $BACKUP_DIR"
    else
        print_info "Updating existing installation..."
        cd "$APP_DIR"
        if [ -d ".git" ]; then
            git fetch origin
            git reset --hard origin/main
            print_status "Updated from GitHub"
        fi
    fi
fi

# Clone from GitHub if directory doesn't exist
if [ ! -d "$APP_DIR" ]; then
    print_info "Cloning from GitHub..."
    git clone "$GITHUB_REPO" "$APP_DIR"
    
    if [ $? -ne 0 ]; then
        print_error "Failed to clone repository!"
        exit 1
    fi
    print_status "Repository cloned successfully"
fi

cd "$APP_DIR"

# Create virtual environment
print_info "Creating Python virtual environment..."
python3 -m venv venv
print_status "Virtual environment created"

# Upgrade pip and install dependencies
print_info "Installing Python dependencies..."
"$APP_DIR/venv/bin/pip" install --upgrade pip
"$APP_DIR/venv/bin/pip" install -r requirements.txt
print_status "Python dependencies installed"

# Create necessary directories
print_info "Creating necessary directories..."
mkdir -p uploads
mkdir -p uploads/site
mkdir -p uploads/courses
mkdir -p uploads/gallery
mkdir -p uploads/general
mkdir -p logs
print_status "Directories created"

# Initialize database if not exists
if [ ! -f "$APP_DIR/data.db" ]; then
    print_info "Initializing database..."
    "$APP_DIR/venv/bin/python" << 'PYEOF'
import sys
sys.path.insert(0, '/opt/lms-website')
from app.database import init_db
init_db()
print("Database initialized successfully!")
PYEOF
    print_status "Database initialized"
else
    print_info "Database already exists"
fi

# Set proper ownership
print_info "Setting proper ownership..."
chown -R "$SERVICE_USER:$SERVICE_USER" "$APP_DIR"
chmod -R 755 "$APP_DIR"
chmod 664 "$APP_DIR/data.db" 2>/dev/null || true
print_status "Ownership set"

# Create systemd service file
print_info "Creating systemd service..."
cat > /etc/systemd/system/lms-website.service << 'EOF'
[Unit]
Description=LMS Website Builder Application
After=network.target
Documentation=https://github.com/dadad132/LMS

[Service]
Type=simple
User=lms
Group=lms
WorkingDirectory=/opt/lms-website
Environment="PATH=/opt/lms-website/venv/bin"
Environment="PYTHONUNBUFFERED=1"

# Start command
ExecStart=/opt/lms-website/venv/bin/python -m uvicorn app.main:app --host 0.0.0.0 --port 8001

# Graceful shutdown with 30 second timeout
TimeoutStopSec=30
KillMode=mixed
KillSignal=SIGTERM

# Restart policy
Restart=on-failure
RestartSec=5

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=lms-website

# Security settings
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
EOF
print_status "Systemd service created"

# Reload systemd
systemctl daemon-reload

# Enable and start service
print_info "Enabling and starting LMS service..."
systemctl enable lms-website
systemctl start lms-website
print_status "LMS service enabled and started"

# Configure firewall (firewalld on AlmaLinux)
print_info "Configuring firewall..."
if command -v firewall-cmd &> /dev/null; then
    firewall-cmd --permanent --add-port=$PORT/tcp
    firewall-cmd --reload
    print_status "Firewall configured for port $PORT"
else
    print_info "firewalld not found, skipping firewall configuration"
fi

# Configure SELinux if enforcing
if command -v getenforce &> /dev/null; then
    SELINUX_STATUS=$(getenforce)
    if [ "$SELINUX_STATUS" == "Enforcing" ]; then
        print_info "Configuring SELinux..."
        # Allow the service to bind to network port
        setsebool -P httpd_can_network_connect 1 2>/dev/null || true
        # Set proper context for the app directory
        semanage fcontext -a -t httpd_sys_content_t "$APP_DIR(/.*)?" 2>/dev/null || true
        restorecon -Rv "$APP_DIR" 2>/dev/null || true
        print_status "SELinux configured"
    else
        print_info "SELinux is $SELINUX_STATUS, skipping SELinux configuration"
    fi
fi

# Check service status
sleep 3
if systemctl is-active --quiet lms-website; then
    print_status "LMS Website Builder is running!"
else
    print_error "Service failed to start. Check logs with: journalctl -u lms-website -f"
    journalctl -u lms-website -n 20 --no-pager
fi

# Get server IP
SERVER_IP=$(hostname -I | awk '{print $1}')

echo ""
echo -e "${BLUE}=========================================${NC}"
echo -e "${GREEN}   Installation Complete!${NC}"
echo -e "${BLUE}=========================================${NC}"
echo ""
echo -e "🎓 LMS Website Builder is now installed!"
echo ""
echo -e "📍 Access URLs:"
echo -e "   Local:    http://localhost:$PORT"
echo -e "   Network:  http://$SERVER_IP:$PORT"
echo ""
echo -e "🔧 Useful Commands:"
echo -e "   Status:   systemctl status lms-website"
echo -e "   Start:    systemctl start lms-website"
echo -e "   Stop:     systemctl stop lms-website"
echo -e "   Restart:  systemctl restart lms-website"
echo -e "   Logs:     journalctl -u lms-website -f"
echo ""
echo -e "📁 Installation Directory: $APP_DIR"
echo ""
echo -e "🔄 To Update from GitHub:"
echo -e "   cd $APP_DIR"
echo -e "   git pull origin main"
echo -e "   systemctl restart lms-website"
echo ""
