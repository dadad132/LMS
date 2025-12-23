#!/bin/bash

###############################################################################
# LMS Website - Uninstall Script
# This will completely remove the LMS installation
###############################################################################

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${RED}=========================================${NC}"
echo -e "${RED}   LMS Website - UNINSTALL${NC}"
echo -e "${RED}=========================================${NC}"
echo ""

if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Please run as root (use sudo)${NC}"
    exit 1
fi

echo -e "${YELLOW}This will completely remove:${NC}"
echo "  - LMS service"
echo "  - All files in /opt/lms-website"
echo "  - Database and uploads"
echo "  - Nginx config for LMS"
echo "  - The 'lms' user"
echo ""
read -p "Are you sure? Type 'yes' to confirm: " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "Cancelled."
    exit 0
fi

echo ""
echo -e "${YELLOW}[i]${NC} Stopping LMS service..."
systemctl stop lms-website 2>/dev/null || true
systemctl disable lms-website 2>/dev/null || true

echo -e "${YELLOW}[i]${NC} Removing systemd service..."
rm -f /etc/systemd/system/lms-website.service
systemctl daemon-reload

echo -e "${YELLOW}[i]${NC} Removing nginx config..."
rm -f /etc/nginx/conf.d/lms.conf
systemctl reload nginx 2>/dev/null || true

echo -e "${YELLOW}[i]${NC} Removing application files..."
rm -rf /opt/lms-website

echo -e "${YELLOW}[i]${NC} Removing lms user..."
userdel lms 2>/dev/null || true

echo ""
echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}   Uninstall Complete!${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""
echo "LMS has been completely removed."
echo ""
echo "To reinstall fresh:"
echo "  git clone https://github.com/dadad132/LMS.git /opt/lms-website"
echo "  cd /opt/lms-website/deployment"
echo "  chmod +x install_almalinux.sh"
echo "  sudo ./install_almalinux.sh"
echo ""
