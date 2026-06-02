#!/bin/bash
# LMS Deployment Script for AlmaLinux
# Automates: clone repo, setup backups, install Nginx, deploy website

set -e  # Exit on error

echo "╔════════════════════════════════════════════════════════════╗"
echo "║         LMS Deployment Script for AlmaLinux               ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Configuration
REPO_URL="https://github.com/dadad132/LMS"
INSTALL_DIR="/opt/lms"
WEB_ROOT="/var/www/html/lms"
DOMAIN="${1:-}"  # Optional domain name as argument

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    log_error "This script must be run with sudo"
    exit 1
fi

# Step 1: Clone or update repository
log_info "Step 1: Setting up repository..."
if [ -d "$INSTALL_DIR" ]; then
    log_info "Repository already exists, updating..."
    cd "$INSTALL_DIR"
    git pull origin main
else
    log_info "Cloning repository..."
    git clone "$REPO_URL" "$INSTALL_DIR"
    cd "$INSTALL_DIR"
fi
log_success "Repository ready at $INSTALL_DIR"
echo ""

# Step 2: Make scripts executable
log_info "Step 2: Making scripts executable..."
chmod +x backup-system.sh restore-from-backup.sh
log_success "Scripts are executable"
echo ""

# Step 3: Set up automated backups
log_info "Step 3: Setting up automated daily backups at 10 PM..."
./backup-system.sh schedule
log_success "Backups scheduled"
echo ""

# Step 4: Create first backup
log_info "Step 4: Creating initial backup..."
./backup-system.sh backup
log_success "Initial backup created"
echo ""

# Step 5: Install Nginx
log_info "Step 5: Installing Nginx..."
dnf install -y nginx > /dev/null 2>&1
log_success "Nginx installed"
echo ""

# Step 6: Deploy website to web root
log_info "Step 6: Deploying website..."
mkdir -p "$WEB_ROOT"
cp -r "$INSTALL_DIR"/* "$WEB_ROOT"/ 2>/dev/null || true
chown -R nginx:nginx "$WEB_ROOT"
chmod -R 755 "$WEB_ROOT"
log_success "Website deployed to $WEB_ROOT"
echo ""

# Step 7: Create Nginx config
log_info "Step 7: Configuring Nginx..."

# Backup existing config
if [ -f /etc/nginx/nginx.conf ]; then
    cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.backup
fi

# Create site config
cat > /etc/nginx/conf.d/lms.conf << 'NGINX_CONFIG'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    
    server_name _;
    root /var/www/html/lms;
    
    index index.html index.htm;
    
    location / {
        try_files $uri $uri/ =404;
    }
    
    error_page 404 /404.html;
    error_page 500 502 503 504 /50x.html;
    
    location ~ /\.git {
        deny all;
    }
    
    location ~ /backups {
        deny all;
    }
}
NGINX_CONFIG

log_success "Nginx configured"
echo ""

# Step 8: Start Nginx
log_info "Step 8: Starting Nginx service..."
systemctl start nginx
systemctl enable nginx
log_success "Nginx started and enabled"
echo ""

# Get IP address for display
IP_ADDRESS=$(hostname -I | awk '{print $1}')

echo "╔════════════════════════════════════════════════════════════╗"
echo "║           ✓ DEPLOYMENT COMPLETE                           ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo -e "${GREEN}Website is now live!${NC}"
echo ""
echo "📍 Access your website at:"
echo "   http://$IP_ADDRESS"
echo ""
echo "📁 Website files:"
echo "   $WEB_ROOT"
echo ""
echo "💾 Backup scripts:"
echo "   $INSTALL_DIR/backup-system.sh"
echo "   $INSTALL_DIR/restore-from-backup.sh"
echo ""
echo "🔄 Automated backups run daily at 10 PM (22:00)"
echo ""
echo "📖 Documentation:"
echo "   $INSTALL_DIR/BACKUP_RESTORE_README.md"
echo ""
echo "⚙️  Common commands:"
echo "   ./backup-system.sh list      # List all backups"
echo "   ./backup-system.sh backup    # Create backup now"
echo "   ./backup-system.sh restore backup_FILE.tar.gz  # Restore"
echo ""
echo "🌐 To enable HTTPS (SSL):"
echo "   1. Set up your domain DNS"
echo "   2. Run: sudo certbot --nginx -d your-domain.com"
echo ""
