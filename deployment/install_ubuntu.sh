#!/bin/bash

###############################################################################
# LMS Website Builder - Ubuntu Automatic Installer
# This script will install and configure the LMS website on Ubuntu
###############################################################################

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}   LMS Website Builder - Ubuntu Installer${NC}"
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

# Check if running as root and set paths accordingly
if [ "$EUID" -eq 0 ]; then 
    print_info "Running as root - installing to /opt/lms-website"
    APP_DIR="/opt/$APP_NAME"
    SERVICE_USER="lms"
else
    APP_DIR="$HOME/$APP_NAME"
    SERVICE_USER="$USER"
fi

print_info "Installation directory: $APP_DIR"
print_info "Service will run as: $SERVICE_USER"
print_info "Port: $PORT"
print_info "Starting installation process..."

# Update system packages
print_info "Updating system packages..."
sudo apt update && sudo apt upgrade -y
print_status "System packages updated"

# Install Python 3.11+ and required system dependencies
print_info "Installing Python and system dependencies..."
sudo apt install -y \
    python3 \
    python3-pip \
    python3-venv \
    python3-dev \
    build-essential \
    git \
    curl \
    sqlite3
print_status "Dependencies installed"

# Check Python version
PYTHON_VERSION=$(python3 --version | cut -d' ' -f2 | cut -d'.' -f1,2)
print_info "Python version: $PYTHON_VERSION"

# Create service user if running as root
if [ "$EUID" -eq 0 ]; then
    if ! id "lms" &>/dev/null; then
        print_info "Creating lms user..."
        sudo useradd -r -s /bin/false -d /opt/lms-website lms
        print_status "User 'lms' created"
    else
        print_info "User 'lms' already exists"
    fi
fi

# Create application directory if it doesn't exist
if [ -d "$APP_DIR" ]; then
    print_info "Application directory already exists at $APP_DIR"
    read -p "Do you want to backup and reinstall? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_info "Backing up existing installation..."
        BACKUP_DIR="${APP_DIR}_backup_$(date +%Y%m%d_%H%M%S)"
        sudo mv "$APP_DIR" "$BACKUP_DIR"
        print_status "Existing installation backed up to $BACKUP_DIR"
    else
        print_info "Keeping existing installation, updating files..."
    fi
fi

# Create the directory
sudo mkdir -p "$APP_DIR"
print_status "Application directory created"

# Copy files (when running from extracted archive)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PARENT_DIR="$(dirname "$SCRIPT_DIR")"

if [ -f "$PARENT_DIR/app/main.py" ]; then
    print_info "Copying application files..."
    sudo cp -r "$PARENT_DIR/app" "$APP_DIR/"
    sudo cp -r "$PARENT_DIR/requirements.txt" "$APP_DIR/"
    sudo cp "$PARENT_DIR/run.py" "$APP_DIR/" 2>/dev/null || true
    sudo cp "$PARENT_DIR/run_public.py" "$APP_DIR/" 2>/dev/null || true
    
    # Copy data.db if exists (preserves existing data)
    if [ -f "$PARENT_DIR/data.db" ] && [ ! -f "$APP_DIR/data.db" ]; then
        sudo cp "$PARENT_DIR/data.db" "$APP_DIR/"
        print_info "Copied existing database"
    fi
    
    # Copy uploads if exists
    if [ -d "$PARENT_DIR/uploads" ]; then
        sudo cp -r "$PARENT_DIR/uploads" "$APP_DIR/"
        print_info "Copied uploads folder"
    fi
    
    print_status "Application files copied"
else
    print_error "Application files not found!"
    print_info "Make sure you're running this from the extracted archive"
    exit 1
fi

cd "$APP_DIR"

# Create virtual environment
print_info "Creating Python virtual environment..."
sudo python3 -m venv venv
print_status "Virtual environment created"

# Install Python dependencies
print_info "Installing Python dependencies..."
sudo "$APP_DIR/venv/bin/pip" install --upgrade pip
sudo "$APP_DIR/venv/bin/pip" install -r requirements.txt
print_status "Python dependencies installed"

# Create necessary directories
print_info "Creating necessary directories..."
sudo mkdir -p uploads
sudo mkdir -p uploads/site
sudo mkdir -p uploads/courses
sudo mkdir -p uploads/gallery
sudo mkdir -p uploads/general
sudo mkdir -p logs
print_status "Directories created"

# Initialize database if not exists
if [ ! -f "$APP_DIR/data.db" ]; then
    print_info "Initializing database..."
    cd "$APP_DIR"
    sudo "$APP_DIR/venv/bin/python" << 'PYEOF'
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
if [ "$EUID" -eq 0 ]; then
    print_info "Setting proper ownership..."
    sudo chown -R lms:lms "$APP_DIR"
    sudo chmod -R 755 "$APP_DIR"
    sudo chmod 664 "$APP_DIR/data.db" 2>/dev/null || true
    print_status "Ownership set"
fi

# Install systemd service
print_info "Installing systemd service..."
sudo cp "$SCRIPT_DIR/lms-website.service" /etc/systemd/system/
sudo systemctl daemon-reload
print_status "Systemd service installed"

# Enable and start service
print_info "Enabling and starting LMS service..."
sudo systemctl enable lms-website
sudo systemctl start lms-website
print_status "LMS service started"

# Check service status
sleep 2
if sudo systemctl is-active --quiet lms-website; then
    print_status "LMS Website Builder is running!"
else
    print_error "Service failed to start. Check logs with: sudo journalctl -u lms-website -f"
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
echo -e "   Status:   sudo systemctl status lms-website"
echo -e "   Start:    sudo systemctl start lms-website"
echo -e "   Stop:     sudo systemctl stop lms-website"
echo -e "   Restart:  sudo systemctl restart lms-website"
echo -e "   Logs:     sudo journalctl -u lms-website -f"
echo ""
echo -e "📁 Installation Directory: $APP_DIR"
echo ""
echo -e "${YELLOW}[!]${NC} Don't forget to configure your firewall:"
echo -e "    sudo ufw allow $PORT/tcp"
echo ""
