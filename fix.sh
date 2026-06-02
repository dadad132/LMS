#!/bin/bash
# JP's Website - Complete Fix
# Run once: sudo bash fix.sh

set -e

if [ "$EUID" -ne 0 ]; then
    echo "Run with: sudo bash fix.sh"
    exit 1
fi

echo "Fixing everything..."

# 1. Clean and deploy
rm -rf /opt/lms-website 2>/dev/null || true
git clone --quiet https://github.com/dadad132/LMS /opt/lms-website
cd /opt/lms-website
git checkout --quiet 0928042
rm -rf .git

# 2. Install dependencies
echo "Installing dependencies..."
dnf install -y python3 python3-pip nginx > /dev/null 2>&1
pip3 install --quiet flask flask-cors 2>/dev/null || true

# 3. Create Flask service
cat > /etc/systemd/system/lms-website.service << 'SERVICE'
[Unit]
Description=LMS Website
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/lms-website
ExecStart=/usr/bin/python3 /opt/lms-website/run.py
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
SERVICE

# 4. Configure Nginx
rm /etc/nginx/conf.d/default.conf 2>/dev/null || true
cat > /etc/nginx/conf.d/lms.conf << 'NGINX'
server {
    listen 80 default_server;
    server_name _;
    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
NGINX

# 5. Start services
systemctl daemon-reload
systemctl restart lms-website
systemctl restart nginx
systemctl enable lms-website
systemctl enable nginx

# 6. Setup backup
mkdir -p /var/backups/lms
cat > /usr/local/bin/backup-lms << 'BACKUP'
#!/bin/bash
tar -czf /var/backups/lms/backup_$(date +%Y-%m-%d_%H%M%S).tar.gz /opt/lms-website 2>/dev/null
echo "Backup created"
BACKUP
chmod +x /usr/local/bin/backup-lms
/usr/local/bin/backup-lms > /dev/null

# Daily backup at 10 PM
echo "0 22 * * * root /usr/local/bin/backup-lms >/dev/null 2>&1" > /etc/cron.d/lms-backup

# 7. Test
sleep 2
IP=$(hostname -I | awk '{print $1}')

echo ""
echo "✅ DONE!"
echo "Visit: http://$IP"
echo ""
