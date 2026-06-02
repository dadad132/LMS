#!/bin/bash
# LMS Complete Deployment - All-in-One Script
# Run this ONCE on your AlmaLinux server:
# sudo bash deploy.sh

set -e

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║    LMS Complete Deployment - All in One                      ║"
echo "║    This will set up everything for you automatically         ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "❌ This script must be run with sudo"
    echo "   Try: sudo bash deploy.sh"
    exit 1
fi

REPO_URL="https://github.com/dadad132/LMS"
INSTALL_DIR="/opt/lms"
WEB_ROOT="/var/www/html/lms"

# Step 1: Clone repository
echo "⏳ Step 1/8: Cloning repository from GitHub..."
if [ -d "$INSTALL_DIR" ]; then
    rm -rf "$INSTALL_DIR"
fi
git clone "$REPO_URL" "$INSTALL_DIR" > /dev/null 2>&1
cd "$INSTALL_DIR"
echo "✓ Repository cloned"

# Step 2: Make scripts executable
echo "⏳ Step 2/8: Making scripts executable..."
chmod +x backup-system.sh restore-from-backup.sh
echo "✓ Scripts ready"

# Step 3: Create initial backup
echo "⏳ Step 3/8: Creating initial backup..."
./backup-system.sh backup > /dev/null
echo "✓ Initial backup created"

# Step 4: Schedule daily backups
echo "⏳ Step 4/8: Scheduling daily backups at 10 PM..."
./backup-system.sh schedule > /dev/null 2>&1
echo "✓ Daily backups scheduled"

# Step 5: Install Nginx
echo "⏳ Step 5/8: Installing Nginx..."
dnf install -y nginx > /dev/null 2>&1
echo "✓ Nginx installed"

# Step 6: Deploy website
echo "⏳ Step 6/8: Deploying website files..."
mkdir -p "$WEB_ROOT"
cp -r "$INSTALL_DIR"/* "$WEB_ROOT"/ 2>/dev/null || true
chown -R nginx:nginx "$WEB_ROOT"
chmod -R 755 "$WEB_ROOT"
echo "✓ Website deployed"

# Step 7: Configure Nginx
echo "⏳ Step 7/8: Configuring Nginx..."
cat > /etc/nginx/conf.d/lms.conf << 'EOF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;
    root /var/www/html/lms;
    index index.html index.htm;
    
    location / {
        try_files $uri $uri/ =404;
    }
    
    location ~ /\.git { deny all; }
    location ~ /backups { deny all; }
}
EOF
echo "✓ Nginx configured"

# Step 8: Start Nginx
echo "⏳ Step 8/8: Starting Nginx..."
systemctl start nginx
systemctl enable nginx
echo "✓ Nginx running"

# Get server info
IP_ADDRESS=$(hostname -I | awk '{print $1}')

echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║           ✓✓✓ DEPLOYMENT COMPLETE ✓✓✓                       ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""
echo "🌐 YOUR WEBSITE IS LIVE!"
echo ""
echo "   http://$IP_ADDRESS"
echo ""
echo "📂 Installation directory: $INSTALL_DIR"
echo "📂 Website directory:      $WEB_ROOT"
echo ""
echo "💾 Automatic Daily Backups: 10 PM (22:00)"
echo "   - Stored in: $INSTALL_DIR/backups/"
echo "   - Also pushed to: GitHub branch"
echo ""
echo "🛠️  Useful Commands:"
echo "   cd $INSTALL_DIR"
echo "   ./backup-system.sh list              # See all backups"
echo "   ./backup-system.sh backup            # Create backup now"
echo "   ./backup-system.sh restore FILE      # Restore backup"
echo "   ./restore-from-backup.sh --branch BRANCH   # Restore from GitHub"
echo ""
echo "📖 Full docs: $INSTALL_DIR/BACKUP_RESTORE_README.md"
echo ""
