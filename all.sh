#!/bin/bash
# JP's Website - ONE COMPLETE SETUP SCRIPT
# Run: sudo bash all.sh

if [ "$EUID" -ne 0 ]; then
    echo "Use: sudo bash all.sh"
    exit 1
fi

echo "Setting up honeypotglobal.co.za as a static site..."

TARGET_DIR="/var/www/html/lms"
TEMP_DIR="/tmp/lms-deploy-$$"
REPO_URL="https://github.com/dadad132/LMS"

rm -rf "$TEMP_DIR" "$TARGET_DIR" 2>/dev/null || true
mkdir -p "$TEMP_DIR"

if ! git clone --quiet "$REPO_URL" "$TEMP_DIR"; then
    echo "ERROR: Failed to clone repository."
    exit 1
fi

cd "$TEMP_DIR"
git checkout --quiet 0928042
rm -rf .git

mkdir -p "$TARGET_DIR"
cp -r "$TEMP_DIR"/* "$TARGET_DIR"/
rm -rf "$TEMP_DIR"

if [ ! -f "$TARGET_DIR/index.html" ]; then
    echo "ERROR: index.html not found in repository."
    exit 1
fi

if ! command -v nginx >/dev/null 2>&1; then
    dnf install -y nginx > /dev/null 2>&1
fi

rm /etc/nginx/conf.d/default.conf 2>/dev/null || true
cat > /etc/nginx/conf.d/lms.conf << 'EOF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name honeypotglobal.co.za www.honeypotglobal.co.za _;
    root /var/www/html/lms;
    index index.html;
    location / {
        try_files $uri $uri/ =404;
    }
}
EOF

nginx -t >/dev/null 2>&1 || true
systemctl restart nginx
systemctl enable nginx >/dev/null 2>&1

mkdir -p /var/backups/lms
cat > /usr/local/bin/backup-lms << 'BACKUP'
#!/bin/bash
BACKUP_DIR="/var/backups/lms"
mkdir -p "$BACKUP_DIR"
tar -czf "$BACKUP_DIR/backup_$(date +%Y-%m-%d_%H%M%S).tar.gz" /var/www/html/lms 2>/dev/null
echo "Backup created: $BACKUP_DIR/backup_$(date +%Y-%m-%d_%H%M%S).tar.gz"
BACKUP
chmod +x /usr/local/bin/backup-lms
/usr/local/bin/backup-lms >/dev/null 2>&1
echo "0 22 * * * root /usr/local/bin/backup-lms >/dev/null 2>&1" > /etc/cron.d/lms-backup

sleep 1
IP=$(hostname -I | awk '{print $1}')
echo ""
echo "✅ DONE!"
echo "Website should now be served from: http://$IP"
echo "Backups stored in: /var/backups/lms/"
echo "Run 'backup-lms' to take an immediate backup."
