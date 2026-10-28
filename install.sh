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

# Step 1: Clean up old Flask/legacy services if they exist
echo "🧹 Cleaning up legacy services (if any)..."
for SVC in lms-website lms-api; do
    if systemctl is-active --quiet "$SVC" 2>/dev/null; then
        systemctl stop "$SVC" 2>/dev/null || true
    fi
    if systemctl is-enabled --quiet "$SVC" 2>/dev/null; then
        systemctl disable "$SVC" 2>/dev/null || true
    fi
done
rm -f /etc/systemd/system/lms-website.service
systemctl daemon-reload

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

# Migrate existing database/password files to persistent secure directory before web root is wiped/updated
echo "🔄 Checking & protecting persistent data in /var/lib/lms..."
sudo mkdir -p "/var/lib/lms/uploads"
sudo chmod 755 "/var/lib/lms"
sudo chmod 755 "/var/lib/lms/uploads"

# Take a pre-install snapshot ONLY if /var/lib/lms has existing user accounts or materials
if [ -s "/var/lib/lms/users.json" ] || [ -s "/var/lib/lms/materials.json" ]; then
    mkdir -p "/var/backups/lms"
    tar -czf "/var/backups/lms/honeypot_backup_preinstall_$(date +%Y-%m-%d_%H%M%S).tar.gz" -C /var/lib/lms . 2>/dev/null || true
fi

# Migrate any database files from $WEB_ROOT or $WEB_ROOT/data if they exist
for SRC_DIR in "$WEB_ROOT" "$WEB_ROOT/data"; do
    for DBF in team.json testimonials.json admin_password.txt users.json materials.json subjects.json modules.json; do
        if [ -s "$SRC_DIR/$DBF" ] && [ ! -s "/var/lib/lms/$DBF" ]; then
            sudo cp -f "$SRC_DIR/$DBF" "/var/lib/lms/$DBF"
            echo "  -> Migrated $DBF from $SRC_DIR"
        fi
    done
    if [ -d "$SRC_DIR/uploads" ]; then
        sudo cp -rn "$SRC_DIR/uploads/"* "/var/lib/lms/uploads/" 2>/dev/null || true
    fi
done

# Auto-restore any missing or empty database files (team, users, materials, subjects, modules, testimonials, uploads) from /var/backups/lms
if [ -d "/var/backups/lms" ]; then
    for BKP in $(ls -1t /var/backups/lms/honeypot_backup_*.tar.gz /var/backups/lms/backup_*.tar.gz 2>/dev/null); do
        TMP_EXTRACT="/tmp/lms_bkp_check_$$"
        mkdir -p "$TMP_EXTRACT"
        tar -xzf "$BKP" -C "$TMP_EXTRACT" 2>/dev/null || true

        for DBF in users.json materials.json subjects.json modules.json team.json testimonials.json admin_password.txt; do
            CUR_SIZE=0
            if [ -f "/var/lib/lms/$DBF" ]; then
                CUR_SIZE=$(wc -c < "/var/lib/lms/$DBF" 2>/dev/null || echo 0)
            fi
            FOUND_BKP_FILE=$(find "$TMP_EXTRACT" -name "$DBF" -type f 2>/dev/null | head -n 1)
            if [ -n "$FOUND_BKP_FILE" ]; then
                BKP_SIZE=$(wc -c < "$FOUND_BKP_FILE" 2>/dev/null || echo 0)
                if [ "$BKP_SIZE" -gt "$CUR_SIZE" ] && [ "$CUR_SIZE" -lt 850 ]; then
                    cp -f "$FOUND_BKP_FILE" "/var/lib/lms/$DBF"
                    echo "✅ Restored $DBF from backup: $(basename "$BKP")"
                fi
            fi
        done

        FOUND_UPLOADS=$(find "$TMP_EXTRACT" -type d -name "uploads" 2>/dev/null | head -n 1)
        if [ -n "$FOUND_UPLOADS" ]; then
            cp -rn "$FOUND_UPLOADS/"* "/var/lib/lms/uploads/" 2>/dev/null || true
        fi

        rm -rf "$TMP_EXTRACT"
    done
fi

echo "📂 Deploying website files to $WEB_ROOT..."
mkdir -p "$WEB_ROOT"
chmod 755 /var /var/www /var/www/html "$WEB_ROOT" 2>/dev/null || true

if [ -f "./index.html" ] && [ -f "./api.py" ]; then
    if [ "$(cd . 2>/dev/null && pwd -P)" != "$(cd "$WEB_ROOT" 2>/dev/null && pwd -P)" ]; then
        echo "👉 Copying files from current directory..."
        cp -rf * "$WEB_ROOT/"
        if [ -d "./.well-known" ]; then
            cp -rf ./.well-known "$WEB_ROOT/"
        fi
    else
        echo "👉 Already running inside $WEB_ROOT — updating in place..."
    fi
else
    echo "👉 Fetching latest files from GitHub..."
    TMP_CLONE="/tmp/lms_clone_$$"
    rm -rf "$TMP_CLONE"
    (cd /tmp && git clone https://github.com/dadad132/LMS "$TMP_CLONE")
    if [ -f "$TMP_CLONE/index.html" ]; then
        cp -rf "$TMP_CLONE"/. "$WEB_ROOT/"
        rm -rf "$TMP_CLONE"
    else
        echo "❌ Failed to clone repository from GitHub."
        rm -rf "$TMP_CLONE"
    fi
fi

# Ensure RFC 9116 security.txt and MTA-STS policy exist in .well-known
echo "🛡️ Configuring .well-known/security.txt and .well-known/mta-sts.txt..."
mkdir -p "$WEB_ROOT/.well-known"
cat > "$WEB_ROOT/.well-known/security.txt" << 'SECURITY_TXT'
Contact: mailto:security@honeypotglobal.co.za
Contact: mailto:honey@honeypotglobal.co.za
Expires: 2027-10-28T00:00:00.000Z
Preferred-Languages: en
Canonical: https://honeypotglobal.co.za/.well-known/security.txt
SECURITY_TXT

cat > "$WEB_ROOT/.well-known/mta-sts.txt" << 'MTA_STS_TXT'
version: STSv1
mode: enforce
mx: mail.honeypotglobal.co.za
mx: *.honeypotglobal.co.za
max_age: 604800
MTA_STS_TXT

# Fix file ownership and permissions so Nginx and systemd can read them
chown -R root:root "$WEB_ROOT"
chmod -R 755 "$WEB_ROOT"
find "$WEB_ROOT" -type f -exec chmod 644 {} \;
chmod 755 "$WEB_ROOT/api.py" 2>/dev/null || true

# Also install api.py to /usr/local/bin/lms-api.py with standard bin_t SELinux context
cp -f "$WEB_ROOT/api.py" /usr/local/bin/lms-api.py
chmod 755 /usr/local/bin/lms-api.py

# Restore correct SELinux file context so Nginx and systemd can serve/execute these files
if command -v restorecon &>/dev/null; then
    restorecon -R "$WEB_ROOT" &>/dev/null || true
    restorecon -v /usr/local/bin/lms-api.py &>/dev/null || true
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
WorkingDirectory=/
ExecStart=/usr/bin/python3 /usr/local/bin/lms-api.py
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

# Verify the API actually started
sleep 2
if systemctl is-active --quiet lms-api; then
    echo "✅ lms-api.service daemon is active on port 8001."
else
    echo "❌ lms-api.service failed to start. Check logs: journalctl -u lms-api -n 20"
    exit 1
fi

# Step 5: SELinux — allow Nginx to proxy to the local Python backend (AlmaLinux/RHEL) & serve uploads
if command -v getenforce &>/dev/null && [ "$(getenforce)" = "Enforcing" ]; then
    echo "🔒 SELinux is Enforcing — allowing Nginx network connections & folder access..."
    setsebool -P httpd_can_network_connect 1
    if command -v semanage &>/dev/null; then
        semanage fcontext -a -t httpd_sys_content_t "/var/lib/lms/uploads(/.*)?" 2>/dev/null || true
    fi
    if command -v restorecon &>/dev/null; then
        restorecon -R "/var/lib/lms/uploads" 2>/dev/null || true
    fi
    echo "✅ SELinux permissions configured."
fi

# Step 6: Open HTTP and HTTPS ports in firewalld (AlmaLinux default)
if command -v firewall-cmd &>/dev/null && systemctl is-active --quiet firewalld; then
    echo "🔥 Opening ports 80 (HTTP) and 443 (HTTPS) in firewall..."
    firewall-cmd --permanent --add-service=http &>/dev/null
    firewall-cmd --permanent --add-service=https &>/dev/null
    firewall-cmd --reload &>/dev/null
    echo "✅ Firewall: ports 80 and 443 open."
fi

# Step 7: Configure Nginx Server Block with Domain name, Security Headers & API Routing (HTTP/HTTPS Auto-detect)
echo "🌐 Configuring Nginx with Web Security Headers..."
rm -f /etc/nginx/conf.d/default.conf
rm -f /etc/nginx/conf.d/lms.conf

DOMAIN="honeypotglobal.co.za"
SSL_CERT="/etc/letsencrypt/live/$DOMAIN/fullchain.pem"
SSL_KEY="/etc/letsencrypt/live/$DOMAIN/privkey.pem"

if [ ! -f "$SSL_CERT" ]; then
    DETECTED_CERT=$(find /etc/letsencrypt/live/ -name "fullchain.pem" 2>/dev/null | head -n 1)
    if [ -n "$DETECTED_CERT" ] && [ -f "$(dirname "$DETECTED_CERT")/privkey.pem" ]; then
        SSL_CERT="$DETECTED_CERT"
        SSL_KEY="$(dirname "$DETECTED_CERT")/privkey.pem"
    fi
fi

if [ -f "$SSL_CERT" ] && [ -f "$SSL_KEY" ]; then
    echo "🔒 SSL certificates detected ($SSL_CERT). Configuring HTTPS + Web Security Headers..."
    tee /etc/nginx/conf.d/lms.conf << 'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name honeypotglobal.co.za www.honeypotglobal.co.za mta-sts.honeypotglobal.co.za;
    server_tokens off;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name honeypotglobal.co.za www.honeypotglobal.co.za mta-sts.honeypotglobal.co.za;
    server_tokens off;

    ssl_certificate __SSL_CERT__;
    ssl_certificate_key __SSL_KEY__;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_session_tickets off;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;

    # --- Web Security Headers ---
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header Content-Security-Policy "default-src 'self' https: http: data: blob: 'unsafe-inline' 'unsafe-eval'; frame-ancestors 'self';" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=(), usb=()" always;

    # Allow large document/video uploads up to 100MB
    client_max_body_size 100M;
    client_body_timeout 120s;

    # Static site files served directly by Nginx (ultra-fast)
    root /var/www/html/lms;
    index index.html;

    # Serve RFC 9116 security.txt, MTA-STS policy, and ACME challenges
    location ^~ /.well-known/ {
        default_type text/plain;
        allow all;
        try_files $uri =404;
    }

    # Serve uploaded study materials directly
    location /uploads/ {
        alias /var/lib/lms/uploads/;
        add_header Content-Disposition "attachment" always;
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header Referrer-Policy "strict-origin-when-cross-origin" always;
        add_header Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=(), usb=()" always;
        access_log off;
    }

    # Forward all backend API calls to the local Python daemon
    location /api/ {
        proxy_pass http://127.0.0.1:8001/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_hide_header Server;
        proxy_hide_header X-Powered-By;
        proxy_hide_header Strict-Transport-Security;
        proxy_hide_header Content-Security-Policy;
        proxy_hide_header X-Frame-Options;
        proxy_hide_header X-Content-Type-Options;
        proxy_hide_header Referrer-Policy;
        proxy_hide_header Permissions-Policy;
        proxy_connect_timeout 30s;
        proxy_read_timeout 120s;
        proxy_send_timeout 120s;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
EOF
    sed -i "s|__SSL_CERT__|$SSL_CERT|g" /etc/nginx/conf.d/lms.conf
    sed -i "s|__SSL_KEY__|$SSL_KEY|g" /etc/nginx/conf.d/lms.conf
else
    echo "⚠️ No SSL certificates found. Configuring HTTP-only fallback with Security Headers..."
    tee /etc/nginx/conf.d/lms.conf << 'EOF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name honeypotglobal.co.za www.honeypotglobal.co.za mta-sts.honeypotglobal.co.za _;
    server_tokens off;

    # --- Web Security Headers ---
    add_header Content-Security-Policy "default-src 'self' https: http: data: blob: 'unsafe-inline' 'unsafe-eval'; frame-ancestors 'self';" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=(), usb=()" always;

    # Allow large document/video uploads up to 100MB
    client_max_body_size 100M;
    client_body_timeout 120s;

    # Static site files served directly by Nginx (ultra-fast)
    root /var/www/html/lms;
    index index.html;

    # Serve RFC 9116 security.txt, MTA-STS policy, and ACME challenges
    location ^~ /.well-known/ {
        default_type text/plain;
        allow all;
        try_files $uri =404;
    }

    # Serve uploaded study materials directly
    location /uploads/ {
        alias /var/lib/lms/uploads/;
        add_header Content-Disposition "attachment" always;
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header Referrer-Policy "strict-origin-when-cross-origin" always;
        add_header Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=(), usb=()" always;
        access_log off;
    }

    # Forward all backend API calls to the local Python daemon
    location /api/ {
        proxy_pass http://127.0.0.1:8001/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_hide_header Server;
        proxy_hide_header X-Powered-By;
        proxy_hide_header Strict-Transport-Security;
        proxy_hide_header Content-Security-Policy;
        proxy_hide_header X-Frame-Options;
        proxy_hide_header X-Content-Type-Options;
        proxy_hide_header Referrer-Policy;
        proxy_hide_header Permissions-Policy;
        proxy_connect_timeout 30s;
        proxy_read_timeout 120s;
        proxy_send_timeout 120s;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
EOF
fi
echo "✅ Nginx server block, Web Security Headers, and API routing configured."

# Step 8: Test & Restart Nginx
echo "🔄 Starting Nginx web server..."
if nginx -t 2>/dev/null; then
    systemctl restart nginx
    systemctl enable nginx &>/dev/null
    echo "✅ Nginx restarted successfully!"
else
    echo "❌ Nginx configuration test failed!"
    nginx -t

    exit 1
fi

# Step 9: Create the 12-Hour Automated Backup Cron Job
echo "💾 Setting up automated 12-hour server backups..."
BACKUP_DIR="/var/backups/lms"
mkdir -p "$BACKUP_DIR"

cat > /usr/local/bin/backup-lms << 'BACKUP_SCRIPT'
#!/bin/bash
BACKUP_DIR="/var/backups/lms"
mkdir -p "$BACKUP_DIR"
TIMESTAMP=$(date +"%Y-%m-%d_%H%M%S")

# Check if dynamic data exists before backing up (never overwrite with empty directory)
if [ -s "/var/lib/lms/users.json" ] || [ -s "/var/lib/lms/materials.json" ] || [ -s "/var/lib/lms/team.json" ]; then
    tar -czf "$BACKUP_DIR/honeypot_backup_$TIMESTAMP.tar.gz" -C /var/lib/lms . 2>/dev/null
    echo "✅ Backup saved: $BACKUP_DIR/honeypot_backup_$TIMESTAMP.tar.gz"
else
    echo "⚠️ Nothing to backup yet."
fi
BACKUP_SCRIPT

chmod +x /usr/local/bin/backup-lms
echo "0 */12 * * * root /usr/local/bin/backup-lms >/dev/null 2>&1" > /etc/cron.d/lms-backup
echo "✅ Automated backup scheduled every 12 hours."

# Copy and register restore utility
if [ -f "./restore.sh" ]; then
    cp -f "./restore.sh" /usr/local/bin/restore-lms
    chmod +x /usr/local/bin/restore-lms
    echo "✅ Restore helper registered: restore-lms"
elif [ -f "$WEB_ROOT/restore.sh" ]; then
    cp -f "$WEB_ROOT/restore.sh" /usr/local/bin/restore-lms
    chmod +x /usr/local/bin/restore-lms
    echo "✅ Restore helper registered: restore-lms"
fi

# Step 10: Final health check
echo ""
echo "🔍 Running final health check..."
sleep 1
API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8001/api/auth-status 2>/dev/null || echo "000")
if [ "$API_STATUS" = "200" ]; then
    echo "✅ API health check passed (HTTP $API_STATUS)"
else
    echo "⚠️  API health check returned HTTP $API_STATUS — check: journalctl -u lms-api -n 20"
fi

# Step 11: Print Deployment Summary
IP=$(hostname -I | awk '{print $1}')
echo ""
echo "═══════════════════════════════════════════════════════"
echo " 🎉 INSTALLATION COMPLETE WITH AUTO-BACKUPS!"
echo "═══════════════════════════════════════════════════════"
echo ""
echo " 🌐 Domain:    http://honeypotglobal.co.za"
echo " 💻 Server IP: http://$IP"
echo ""
echo " 💾 Backups Directory: $BACKUP_DIR/"
echo " 💡 Runs automatically every 12 hours."
echo "    Run manually at any time with: backup-lms"
echo "    Restore previous data with:    restore-lms"
echo ""
echo " 🚀 Edits made in the Admin Panel sync to disk"
echo "    and persist for all global visitors!"
echo ""
echo "═══════════════════════════════════════════════════════"

