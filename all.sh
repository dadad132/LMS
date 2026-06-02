#!/bin/bash
# JP's Website - ONE COMPLETE SETUP SCRIPT
# Run: sudo bash all.sh

if [ "$EUID" -ne 0 ]; then echo "Use: sudo bash all.sh"; exit 1; fi

echo "Setting up honeypotglobal.co.za..."

# Clean deploy
rm -rf /opt/lms-website /opt/lms 2>/dev/null
git clone --quiet https://github.com/dadad132/LMS /opt/lms-website
cd /opt/lms-website && git checkout --quiet 0928042 && rm -rf .git

# Install dependencies
dnf install -y python3 python3-pip nginx > /dev/null 2>&1
pip3 install -q flask flask-cors 2>/dev/null

# Flask service
cat > /etc/systemd/system/lms.service << 'EOF'
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
EOF

# Nginx config
rm /etc/nginx/conf.d/default.conf 2>/dev/null
cat > /etc/nginx/conf.d/lms.conf << 'EOF'
server {
    listen 80 default_server;
    server_name honeypotglobal.co.za www.honeypotglobal.co.za _;
    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
EOF

# Start services
systemctl daemon-reload && systemctl restart lms && systemctl restart nginx
systemctl enable lms && systemctl enable nginx

# Backups
mkdir -p /var/backups/lms
echo '#!/bin/bash
tar -czf /var/backups/lms/backup_$(date +%Y-%m-%d_%H%M%S).tar.gz /opt/lms-website 2>/dev/null' > /usr/local/bin/backup-lms
chmod +x /usr/local/bin/backup-lms
/usr/local/bin/backup-lms > /dev/null
echo "0 22 * * * root /usr/local/bin/backup-lms >/dev/null 2>&1" > /etc/cron.d/lms-backup

# Show results
sleep 2
IP=$(hostname -I | awk '{print $1}')
echo ""
echo "✅ DONE!"
echo ""
echo "Website running at: http://$IP"
echo "Backups: /var/backups/lms/"
echo ""
