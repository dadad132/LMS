#!/bin/bash
# ==============================================================
# LMS Website Builder - AlmaLinux 10 Installation Script
# ==============================================================
# This script will set up everything needed to run the LMS
# Run as root or with sudo
# ==============================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  LMS Website Builder Installer${NC}"
echo -e "${GREEN}  For AlmaLinux 10${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Please run as root (use sudo)${NC}"
    exit 1
fi

# Configuration - CHANGE THESE
APP_USER="${APP_USER:-lmsuser}"
APP_DIR="${APP_DIR:-/var/www/lms}"
DOMAIN="${DOMAIN:-yourdomain.com}"

echo -e "${YELLOW}Configuration:${NC}"
echo "  App User: $APP_USER"
echo "  App Directory: $APP_DIR"
echo "  Domain: $DOMAIN"
echo ""
read -p "Press Enter to continue or Ctrl+C to cancel..."

# ==============================================================
# 1. System Update & Dependencies
# ==============================================================
echo -e "${GREEN}[1/8] Updating system and installing dependencies...${NC}"

dnf update -y
dnf install -y epel-release
dnf install -y \
    python3.11 \
    python3.11-pip \
    python3.11-devel \
    nginx \
    git \
    gcc \
    make \
    openssl-devel \
    libffi-devel \
    sqlite \
    certbot \
    python3-certbot-nginx \
    firewalld

# Enable and start firewalld
systemctl enable firewalld
systemctl start firewalld

# ==============================================================
# 2. Create Application User
# ==============================================================
echo -e "${GREEN}[2/8] Creating application user...${NC}"

if ! id "$APP_USER" &>/dev/null; then
    useradd -r -m -d /home/$APP_USER -s /bin/bash $APP_USER
    echo -e "${GREEN}User $APP_USER created${NC}"
else
    echo -e "${YELLOW}User $APP_USER already exists${NC}"
fi

# ==============================================================
# 3. Create Application Directory
# ==============================================================
echo -e "${GREEN}[3/8] Setting up application directory...${NC}"

mkdir -p $APP_DIR
mkdir -p $APP_DIR/logs
mkdir -p $APP_DIR/backups
mkdir -p $APP_DIR/uploads/{general,site,Video,Info}

# Set ownership
chown -R $APP_USER:$APP_USER $APP_DIR

# ==============================================================
# 4. Clone or Copy Application
# ==============================================================
echo -e "${GREEN}[4/8] Setting up application files...${NC}"

# If running from git
if [ -d ".git" ]; then
    echo "Copying application files..."
    cp -r app $APP_DIR/
    cp -r requirements.txt run.py run_public.py $APP_DIR/ 2>/dev/null || true
else
    echo -e "${YELLOW}Please copy your application files to $APP_DIR${NC}"
    echo "Expected structure:"
    echo "  $APP_DIR/app/"
    echo "  $APP_DIR/requirements.txt"
    echo "  $APP_DIR/run.py"
fi

chown -R $APP_USER:$APP_USER $APP_DIR

# ==============================================================
# 5. Python Virtual Environment & Dependencies
# ==============================================================
echo -e "${GREEN}[5/8] Creating Python virtual environment...${NC}"

su - $APP_USER << EOF
cd $APP_DIR
python3.11 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
pip install gunicorn
EOF

# ==============================================================
# 6. Create Systemd Service
# ==============================================================
echo -e "${GREEN}[6/8] Creating systemd service...${NC}"

cat > /etc/systemd/system/lms.service << EOF
[Unit]
Description=LMS Website Builder
After=network.target

[Service]
Type=simple
User=$APP_USER
Group=$APP_USER
WorkingDirectory=$APP_DIR
Environment="PATH=$APP_DIR/venv/bin"
Environment="SECRET_KEY=$(openssl rand -hex 32)"
Environment="ADMIN_SECRET_PATH=admin-$(openssl rand -hex 8)"
ExecStart=$APP_DIR/venv/bin/gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker -b 127.0.0.1:8000
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

# Store the admin path for later
ADMIN_PATH=$(grep ADMIN_SECRET_PATH /etc/systemd/system/lms.service | cut -d'"' -f2 | cut -d'=' -f2)

systemctl daemon-reload
systemctl enable lms

# ==============================================================
# 7. Configure Nginx
# ==============================================================
echo -e "${GREEN}[7/8] Configuring Nginx...${NC}"

cat > /etc/nginx/conf.d/lms.conf << EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;
    
    # Redirect to HTTPS (uncomment after SSL is set up)
    # return 301 https://\$server_name\$request_uri;
    
    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
    
    # Static files
    location /static {
        alias $APP_DIR/app/static;
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }
    
    # Uploads
    location /uploads {
        alias $APP_DIR/uploads;
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Max upload size
    client_max_body_size 100M;
}
EOF

# Test nginx config
nginx -t

# ==============================================================
# 8. Firewall & SELinux
# ==============================================================
echo -e "${GREEN}[8/8] Configuring firewall and SELinux...${NC}"

# Firewall
firewall-cmd --permanent --add-service=http
firewall-cmd --permanent --add-service=https
firewall-cmd --reload

# SELinux (allow nginx to connect to gunicorn)
setsebool -P httpd_can_network_connect 1

# ==============================================================
# Start Services
# ==============================================================
echo -e "${GREEN}Starting services...${NC}"

systemctl start lms
systemctl start nginx
systemctl enable nginx

# ==============================================================
# Summary
# ==============================================================
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Installation Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "Your LMS is now running at: ${YELLOW}http://$DOMAIN${NC}"
echo ""
echo -e "${YELLOW}IMPORTANT - Save this information:${NC}"
echo -e "  Admin Panel URL: http://$DOMAIN/$ADMIN_PATH"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "  1. Point your domain's DNS to this server's IP"
echo "  2. Run: certbot --nginx -d $DOMAIN -d www.$DOMAIN"
echo "  3. Visit your site and complete the setup wizard"
echo ""
echo -e "${YELLOW}Useful Commands:${NC}"
echo "  View logs:     journalctl -u lms -f"
echo "  Restart app:   systemctl restart lms"
echo "  Check status:  systemctl status lms"
echo ""
echo -e "${GREEN}========================================${NC}"
