#!/bin/bash
# JP's Website - SIMPLE VERSION (Static HTML + Nginx)
# Run: sudo bash all.sh

if [ "$EUID" -ne 0 ]; then echo "Use: sudo bash all.sh"; exit 1; fi

echo "Setting up honeypotglobal.co.za..."

# Clean deploy
rm -rf /var/www/html/lms 2>/dev/null
git clone --quiet https://github.com/dadad132/LMS /tmp/lms-temp
cd /tmp/lms-temp && git checkout --quiet 0928042
rm -rf /tmp/lms-temp/.git

# Copy to web root
mkdir -p /var/www/html/lms
cp -r /tmp/lms-temp/* /var/www/html/lms/
rm -rf /tmp/lms-temp

# Install Nginx
dnf install -y nginx > /dev/null 2>&1

# Nginx config - serve static files
rm /etc/nginx/conf.d/default.conf 2>/dev/null
cat > /etc/nginx/conf.d/lms.conf << 'EOF'
server {
    listen 80 default_server;
    server_name honeypotglobal.co.za www.honeypotglobal.co.za _;
    root /var/www/html/lms;
    index index.html;
    
    location / {
        try_files $uri $uri/ =404;
    }
}
EOF

# Start Nginx
systemctl restart nginx
systemctl enable nginx

# Backups
mkdir -p /var/backups/lms
echo '#!/bin/bash
tar -czf /var/backups/lms/backup_$(date +%Y-%m-%d_%H%M%S).tar.gz /var/www/html/lms 2>/dev/null' > /usr/local/bin/backup-lms
chmod +x /usr/local/bin/backup-lms
/usr/local/bin/backup-lms > /dev/null
echo "0 22 * * * root /usr/local/bin/backup-lms >/dev/null 2>&1" > /etc/cron.d/lms-backup

# Results
sleep 2
IP=$(hostname -I | awk '{print $1}')
echo ""
echo "✅ DONE!"
echo "Website: http://$IP"
echo "Backups: /var/backups/lms/"
echo ""
