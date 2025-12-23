#!/bin/bash

###############################################################################
# LMS Domain & SSL Setup Script
# Domain: honeypotglobal.co.za
###############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

DOMAIN="honeypotglobal.co.za"
LMS_PORT="8001"

echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}   LMS Domain Setup - $DOMAIN${NC}"
echo -e "${BLUE}=========================================${NC}"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Please run as root (use sudo)${NC}"
    exit 1
fi

# Check if LMS is running
echo -e "${YELLOW}[i]${NC} Checking if LMS is running on port $LMS_PORT..."
if curl -s http://127.0.0.1:$LMS_PORT > /dev/null 2>&1; then
    echo -e "${GREEN}[✓]${NC} LMS is running"
else
    echo -e "${RED}[✗]${NC} LMS is not running on port $LMS_PORT"
    echo -e "${YELLOW}[i]${NC} Please run the install_almalinux.sh script first"
    exit 1
fi

# Install nginx
echo -e "${YELLOW}[i]${NC} Installing nginx..."
dnf install -y nginx
echo -e "${GREEN}[✓]${NC} Nginx installed"

# Install certbot
echo -e "${YELLOW}[i]${NC} Installing certbot for SSL..."
dnf install -y certbot python3-certbot-nginx
echo -e "${GREEN}[✓]${NC} Certbot installed"

# Create nginx config
echo -e "${YELLOW}[i]${NC} Creating nginx configuration..."
cat > /etc/nginx/conf.d/lms.conf << EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;

    location / {
        proxy_pass http://127.0.0.1:$LMS_PORT;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 90;
        proxy_connect_timeout 90;
    }

    # Handle large file uploads
    client_max_body_size 50M;
}
EOF
echo -e "${GREEN}[✓]${NC} Nginx configuration created"

# Test nginx config
echo -e "${YELLOW}[i]${NC} Testing nginx configuration..."
nginx -t
echo -e "${GREEN}[✓]${NC} Nginx configuration is valid"

# Enable and start nginx
echo -e "${YELLOW}[i]${NC} Starting nginx..."
systemctl enable nginx
systemctl start nginx
echo -e "${GREEN}[✓]${NC} Nginx started"

# Configure firewall
echo -e "${YELLOW}[i]${NC} Configuring firewall..."
firewall-cmd --permanent --add-service=http 2>/dev/null || true
firewall-cmd --permanent --add-service=https 2>/dev/null || true
firewall-cmd --reload 2>/dev/null || true
echo -e "${GREEN}[✓]${NC} Firewall configured"

# Check if domain is pointing to this server
echo ""
echo -e "${YELLOW}[i]${NC} Checking if $DOMAIN is pointing to this server..."
SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')
DOMAIN_IP=$(dig +short $DOMAIN 2>/dev/null | head -1)

echo -e "${YELLOW}[i]${NC} Your server IP: $SERVER_IP"
echo -e "${YELLOW}[i]${NC} Domain points to: $DOMAIN_IP"

if [ "$SERVER_IP" = "$DOMAIN_IP" ]; then
    echo -e "${GREEN}[✓]${NC} Domain is correctly pointing to this server!"
    
    # Get SSL certificate
    echo ""
    echo -e "${YELLOW}[i]${NC} Getting SSL certificate from Let's Encrypt..."
    certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN --redirect
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}[✓]${NC} SSL certificate installed!"
    else
        echo -e "${YELLOW}[!]${NC} SSL setup had issues. You can try manually later:"
        echo "    sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN"
    fi
else
    echo ""
    echo -e "${YELLOW}=========================================${NC}"
    echo -e "${YELLOW}   DNS Not Ready Yet${NC}"
    echo -e "${YELLOW}=========================================${NC}"
    echo ""
    echo -e "Your domain $DOMAIN is not pointing to this server yet."
    echo ""
    echo -e "1. Go to your DNS settings at domains.co.za"
    echo -e "2. Add these records:"
    echo ""
    echo -e "   Type: A    Name: @      Value: ${GREEN}$SERVER_IP${NC}"
    echo -e "   Type: A    Name: www    Value: ${GREEN}$SERVER_IP${NC}"
    echo ""
    echo -e "3. Wait 5-30 minutes for DNS to propagate"
    echo ""
    echo -e "4. Then run this command to get SSL:"
    echo -e "   ${GREEN}sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN${NC}"
    echo ""
fi

# Reload nginx with any changes
systemctl reload nginx

echo ""
echo -e "${BLUE}=========================================${NC}"
echo -e "${GREEN}   Setup Complete!${NC}"
echo -e "${BLUE}=========================================${NC}"
echo ""
echo -e "Your LMS will be available at:"
echo -e "   ${GREEN}https://$DOMAIN${NC}"
echo ""
echo -e "Useful commands:"
echo -e "   Check nginx status:  systemctl status nginx"
echo -e "   Check LMS status:    systemctl status lms-website"
echo -e "   Renew SSL:           sudo certbot renew"
echo ""
