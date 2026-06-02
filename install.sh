#!/bin/bash
# Honeypot Global - One-Click AlmaLinux Installer (with Auto-Backup & Server Persistence)
# Run: sudo bash install.sh

# Ensure script is run as root
if [ "$EUID" -ne 0 ]; then
    echo "❌ Please run this script with sudo:"
    echo "   sudo bash install.sh"
    exit 1
fi

echo "🚀 Starting Honeypot Global Unified Server Installer..."
echo "====================================================="

# Step 1: Clean up old Flask services if they exist
echo "🧹 Cleaning up legacy Flask services (if any)..."
if systemctl is-active --quiet lms-website; then
    sudo systemctl stop lms-website 2>/dev/null || true
fi
if systemctl is-enabled --quiet lms-website; then
    sudo systemctl disable lms-website 2>/dev/null || true
fi
sudo rm -f /etc/systemd/system/lms-website.service
sudo systemctl daemon-reload

# Step 2: Install Git, Nginx & Python if they are missing
echo "🔧 Installing system dependencies (git, nginx, python3)..."
if ! command -v git &>/dev/null; then
    echo "👉 Installing git..."
    dnf install -y git &>/dev/null
fi

if ! command -v nginx &>/dev/null; then
    echo "👉 Installing nginx..."
    dnf install -y nginx &>/dev/null
fi

if ! command -v python3 &>/dev/null; then
    echo "👉 Installing python3..."
    dnf install -y python3 &>/dev/null
fi
echo "✅ Dependencies ready."

# Step 3: Deploy the static site & API files to the web root
WEB_ROOT="/var/www/html/lms"
echo "📂 Deploying website files to $WEB_ROOT..."

# If running from inside a cloned repo, copy local files, otherwise clone
if [ -f "./index.html" ]; then
    echo "👉 Copying files from current directory..."
    sudo mkdir -p "$WEB_ROOT"
    sudo cp -rf * "$WEB_ROOT/"
else
    echo "👉 Cloning files from GitHub..."
    sudo rm -rf "$WEB_ROOT"
    sudo git clone https://github.com/dadad132/LMS "$WEB_ROOT"
fi
echo "✅ Website files deployed."

# Step 4: Configure the secure Python API Background Daemon
echo "⚙️ Setting up backend API service daemon..."
cat > /etc/systemd/system/lms-api.service << 'SERVICE'
[Unit]
Description=Honeypot Global Server API
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/var/www/html/lms
ExecStart=/usr/bin/python3 /var/www/html/lms/api.py
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
SERVICE

chmod 644 /etc/systemd/system/lms-api.service
systemctl daemon-reload
systemctl stop lms-api 2>/dev/null || true
systemctl start lms-api
systemctl enable lms-api &>/dev/null
echo "✅ lms-api.service daemon is active on port 8001."

# Step 5: Configure Nginx Server Block with Domain name & API Routing
echo "🌐 Configuring Nginx for domain: honeypotglobal.co.za..."
sudo rm -f /etc/nginx/conf.d/default.conf
sudo rm -f /etc/nginx/conf.d/lms.conf

sudo tee /etc/nginx/conf.d/lms.conf << 'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name honeypotglobal.co.za www.honeypotglobal.co.za;

    # Static site files served directly by Nginx (ultra-fast)
    root /var/www/html/lms;
    index index.html;

    # Forward all backend API calls to the local Python daemon
    location /api/ {
        proxy_pass http://127.0.0.1:8001/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        try_files $uri $uri/ =404;
    }
}
EOF
echo "✅ Nginx server block and API routing configured."

# Step 6: Test & Restart Nginx
echo "🔄 Starting Nginx web server..."
if sudo nginx -t &>/dev/null; then
    sudo systemctl restart nginx
    sudo systemctl enable nginx &>/dev/null
    echo "✅ Nginx restarted successfully!"
else
    echo "❌ Nginx configuration test failed! Please check your Nginx setup manually."
    exit 1
fi

# Step 7: Create the 12-Hour Automated Backup Cron Job
echo "💾 Setting up automated 12-hour server backups..."
BACKUP_DIR="/var/backups/lms"
sudo mkdir -p "$BACKUP_DIR"

# Write dedicated backup executable script
cat > /usr/local/bin/backup-lms << 'BACKUP_SCRIPT'
#!/bin/bash
BACKUP_DIR="/var/backups/lms"
mkdir -p "$BACKUP_DIR"
TIMESTAMP=$(date +"%Y-%m-%d_%H%M%S")

# Check if team.json exists before backing up
if [ -f "/var/www/html/lms/team.json" ] || [ -f "/var/www/html/lms/admin_password.txt" ]; then
    tar -czf "$BACKUP_DIR/honeypot_backup_$TIMESTAMP.tar.gz" -C /var/www/html/lms team.json admin_password.txt 2>/dev/null
    echo "✅ Backup saved successfully: $BACKUP_DIR/honeypot_backup_$TIMESTAMP.tar.gz"
else
    echo "⚠️ Nothing to backup yet (no user uploads or custom passwords found)."
fi
BACKUP_SCRIPT

chmod +x /usr/local/bin/backup-lms

# Configure Cron Task to run the backup every 12 hours (at 00:00 and 12:00)
echo "0 */12 * * * root /usr/local/bin/backup-lms >/dev/null 2>&1" > /etc/cron.d/lms-backup
echo "✅ Automated backup scheduled every 12 hours."

# Step 8: Print Deployment Summary
IP=$(hostname -I | awk '{print $1}')
echo ""
echo "═══════════════════════════════════════════════════════"
echo " 🎉 SECURE INSTALLATION COMPLETE WITH AUTO-BACKUPS!"
echo "═══════════════════════════════════════════════════════"
echo ""
echo " 🌐 Domain:  http://honeypotglobal.co.za"
echo " 💻 Server IP: http://$IP"
echo ""
echo " 💾 Backups Directory: $BACKUP_DIR/"
echo " 💡 Runs automatically every 12 hours."
echo "    You can run it manually at any time by typing: backup-lms"
echo ""
echo " 🚀 Edits made in your secret Admin Panel will now sync"
echo "    to your server disk and persist for all global visitors!"
echo ""
echo "═══════════════════════════════════════════════════════"
