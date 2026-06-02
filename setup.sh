#!/bin/bash
# Simple Setup: Homepage + Backups (No clutter)
# Run once: sudo bash setup.sh

if [ "$EUID" -ne 0 ]; then
    echo "❌ Run with sudo: sudo bash setup.sh"
    exit 1
fi

echo "🔧 Setting up website and backups..."

# Step 1: Deploy only the homepage (commit #2)
TEMP_DIR="/tmp/lms-deploy-$$"
mkdir -p "$TEMP_DIR"
cd "$TEMP_DIR"

git clone --quiet https://github.com/dadad132/LMS . 2>/dev/null
git checkout --quiet 0928042 2>/dev/null

# Remove git files
rm -rf .git

# Deploy to web root
rm -rf /var/www/html/lms 2>/dev/null || true
mkdir -p /var/www/html/lms
cp -r . /var/www/html/lms/

# Cleanup temp
rm -rf "$TEMP_DIR"

# Set permissions
chown -R nginx:nginx /var/www/html/lms
chmod -R 755 /var/www/html/lms

echo "✓ Website deployed"

# Step 2: Install Nginx (if not installed)
if ! command -v nginx &> /dev/null; then
    echo "🔧 Installing Nginx..."
    dnf install -y nginx > /dev/null 2>&1
fi

# Step 3: Configure Nginx
echo "🔧 Configuring Nginx..."
rm /etc/nginx/conf.d/default.conf 2>/dev/null || true
rm /etc/nginx/sites-enabled/default 2>/dev/null || true

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
}
EOF

nginx -t > /dev/null 2>&1
systemctl start nginx
systemctl enable nginx > /dev/null 2>&1

echo "✓ Nginx configured"

# Step 4: Setup backups (separate directory)
BACKUP_DIR="/var/backups/lms"
mkdir -p "$BACKUP_DIR"

# Create simple backup script
cat > /usr/local/bin/backup-lms << 'BACKUP_SCRIPT'
#!/bin/bash
BACKUP_DIR="/var/backups/lms"
TIMESTAMP=$(date +"%Y-%m-%d_%H%M%S")
tar -czf "$BACKUP_DIR/backup_$TIMESTAMP.tar.gz" /var/www/html/lms
echo "Backup created: $BACKUP_DIR/backup_$TIMESTAMP.tar.gz"
BACKUP_SCRIPT

chmod +x /usr/local/bin/backup-lms

# Create restore script
cat > /usr/local/bin/restore-lms << 'RESTORE_SCRIPT'
#!/bin/bash
if [ -z "$1" ]; then
    echo "Usage: restore-lms backup_FILE.tar.gz"
    ls -lh /var/backups/lms/
    exit 1
fi
BACKUP_FILE="/var/backups/lms/$1"
if [ ! -f "$BACKUP_FILE" ]; then
    echo "Backup not found: $BACKUP_FILE"
    exit 1
fi
echo "Restoring from $1..."
tar -xzf "$BACKUP_FILE" -C / --strip-components=3
chown -R nginx:nginx /var/www/html/lms
systemctl reload nginx
echo "Restore complete!"
RESTORE_SCRIPT

chmod +x /usr/local/bin/restore-lms

# Create initial backup
/usr/local/bin/backup-lms > /dev/null

echo "✓ Backups configured"

# Step 5: Schedule daily backup at 10 PM
cat > /etc/cron.d/lms-backup << 'CRON'
0 22 * * * root /usr/local/bin/backup-lms
CRON

echo "✓ Daily backup scheduled (10 PM)"

# Done
IP=$(hostname -I | awk '{print $1}')
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
