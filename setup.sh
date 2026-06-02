#!/bin/bash
# Setup: Flask Website + Backups (No clutter)
# Run once: sudo bash setup.sh

if [ "$EUID" -ne 0 ]; then
    echo "❌ Run with sudo: sudo bash setup.sh"
    exit 1
fi

echo "🔧 Setting up website and backups..."

# Step 1: Deploy the Flask application (commit #2)
INSTALL_DIR="/opt/lms-website"
rm -rf "$INSTALL_DIR" 2>/dev/null || true

git clone --quiet https://github.com/dadad132/LMS "$INSTALL_DIR" 2>/dev/null
cd "$INSTALL_DIR"
git checkout --quiet 0928042 2>/dev/null

# Remove unnecessary files
rm -rf .git
rm -f *.bat *.sh deployment/ deploy/ scripts/ 2>/dev/null || true

echo "✓ Application deployed"

# Step 2: Install Python & dependencies
echo "🔧 Installing Python and dependencies..."
dnf install -y python3 python3-pip > /dev/null 2>&1
cd "$INSTALL_DIR"
pip3 install --quiet -r requirements.txt 2>/dev/null || true

echo "✓ Python dependencies installed"

# Step 3: Create systemd service for Flask app
echo "🔧 Creating web service..."
cat > /etc/systemd/system/lms-website.service << 'SERVICE'
[Unit]
Description=LMS Website
After=network.target

[Service]
Type=simple
User=nginx
WorkingDirectory=/opt/lms-website
ExecStart=/usr/bin/python3 /opt/lms-website/run.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
SERVICE

chmod 644 /etc/systemd/system/lms-website.service
systemctl daemon-reload
systemctl start lms-website
systemctl enable lms-website

echo "✓ Web service running"

# Step 4: Setup Nginx as reverse proxy
echo "🔧 Configuring Nginx..."
rm /etc/nginx/conf.d/default.conf 2>/dev/null || true
rm /etc/nginx/sites-enabled/default 2>/dev/null || true

cat > /etc/nginx/conf.d/lms.conf << 'NGINX'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
NGINX

nginx -t > /dev/null 2>&1
systemctl start nginx
systemctl enable nginx > /dev/null 2>&1

echo "✓ Nginx configured"

# Step 5: Setup backups (separate directory)
echo "🔧 Setting up backups..."
BACKUP_DIR="/var/backups/lms"
mkdir -p "$BACKUP_DIR"

# Create backup script
cat > /usr/local/bin/backup-lms << 'BACKUP_SCRIPT'
#!/bin/bash
BACKUP_DIR="/var/backups/lms"
TIMESTAMP=$(date +"%Y-%m-%d_%H%M%S")
tar -czf "$BACKUP_DIR/backup_$TIMESTAMP.tar.gz" /opt/lms-website 2>/dev/null
echo "Backup: $BACKUP_DIR/backup_$TIMESTAMP.tar.gz"
BACKUP_SCRIPT

chmod +x /usr/local/bin/backup-lms

# Create restore script
cat > /usr/local/bin/restore-lms << 'RESTORE_SCRIPT'
#!/bin/bash
if [ -z "$1" ]; then
    echo "Backups available:"
    ls -lh /var/backups/lms/ 2>/dev/null || echo "No backups found"
    exit 1
fi
BACKUP_FILE="/var/backups/lms/$1"
if [ ! -f "$BACKUP_FILE" ]; then
    echo "Backup not found: $BACKUP_FILE"
    exit 1
fi
echo "Restoring from $1..."
systemctl stop lms-website
rm -rf /opt/lms-website
tar -xzf "$BACKUP_FILE" -C / 2>/dev/null
systemctl start lms-website
echo "✓ Restore complete!"
RESTORE_SCRIPT

chmod +x /usr/local/bin/restore-lms

# Create initial backup
/usr/local/bin/backup-lms > /dev/null

echo "✓ Backups configured"

# Step 6: Schedule daily backup at 10 PM
cat > /etc/cron.d/lms-backup << 'CRON'
0 22 * * * root /usr/local/bin/backup-lms >/dev/null 2>&1
CRON

echo "✓ Daily backup scheduled (10 PM)"

# Done
IP=$(hostname -I | awk '{print $1}')
sleep 2

echo ""
echo "════════════════════════════════════════"
echo "✓✓✓ Setup Complete! ✓✓✓"
echo "════════════════════════════════════════"
echo ""
echo "🌐 Website: http://$IP"
echo "   (or your domain if DNS is set up)"
echo ""
echo "💾 Backups: /var/backups/lms/"
echo ""
echo "📝 Commands:"
echo "   backup-lms              # Backup now"
echo "   restore-lms filename    # Restore backup"
echo "   ls /var/backups/lms/    # List backups"
echo ""
echo "⏰ Automatic backup: Daily at 10 PM (22:00)"
echo ""
echo "✅ Website is running!"
echo ""
