#!/bin/bash
# Honeypot Global - One-Click AlmaLinux Installer (with Auto-Backup & Server Persistence)
# Run: sudo bash install.sh

# Ensure script is run as root
if [ "$EUID" -ne 0 ]; then
    echo "❌ Please run this script with sudo:"
    echo "   sudo bash install.sh"
    exit 1
fi

# If the user's terminal is standing in a deleted/unlinked folder, move to /tmp immediately
if ! pwd >/dev/null 2>&1; then
    cd /tmp || cd /
fi
SCRIPT_START_DIR="$(pwd -P 2>/dev/null || echo /tmp)"

# Ensure working DNS resolution on the server before using git or dnf
if ! getent hosts github.com >/dev/null 2>&1; then
    echo "🌐 Fixing server DNS resolution (/etc/resolv.conf)..."
    printf "nameserver 8.8.8.8\nnameserver 1.1.1.1\n" >> /etc/resolv.conf
fi

echo "🚀 Starting Honeypot Global Unified Server Installer..."
echo "====================================================="

# Step 1: Search the whole server for any old LMS services/processes and remove them (keeping backups safe)
echo "🧹 Scanning server and removing old LMS service files (keeping /var/backups/lms safe)..."
for SVC in lms lms-website lms-api; do
    systemctl stop "$SVC" 2>/dev/null || true
    systemctl disable "$SVC" 2>/dev/null || true
done
pkill -f "/var/www/html/lms/api.py" 2>/dev/null || true
pkill -f "/usr/local/bin/lms-api.py" 2>/dev/null || true
pkill -f "/opt/LMS/api.py" 2>/dev/null || true

# Remove all lms, lms-api, and lms-website systemd unit files & overrides across the entire server
find /etc/systemd/system /usr/lib/systemd/system /lib/systemd/system /run/systemd/system \
    \( -name "lms.service*" -o -name "lms-api*" -o -name "lms-website*" \) -exec rm -rf {} + 2>/dev/null || true
rm -f /usr/local/bin/lms-api.py 2>/dev/null || true
systemctl daemon-reload
systemctl reset-failed 2>/dev/null || true
echo "✅ Old services (lms, lms-website, lms-api) removed cleanly."

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

# Migrate existing database/password files to persistent secure directory before web root is updated
echo "🔄 Checking & protecting persistent data in /var/lib/lms and /var/backups/lms..."
mkdir -p "/var/backups/lms"
mkdir -p "/var/lib/lms/uploads"
chmod 755 "/var/lib/lms" "/var/lib/lms/uploads"

# Migrate any database files from known server directories if they are larger than current /var/lib/lms files
for SRC_DIR in "$WEB_ROOT" "$WEB_ROOT/data" "/opt/LMS" "/opt/LMS/data" "/opt/lms-website" "/root/LMS"; do
    for DBF in team.json testimonials.json admin_password.txt users.json materials.json subjects.json modules.json; do
        if [ -s "$SRC_DIR/$DBF" ]; then
            SRC_SIZE=$(wc -c < "$SRC_DIR/$DBF" 2>/dev/null || echo 0)
            CUR_SIZE=0
            if [ -f "/var/lib/lms/$DBF" ]; then
                CUR_SIZE=$(wc -c < "/var/lib/lms/$DBF" 2>/dev/null || echo 0)
            fi
            if [ "$SRC_SIZE" -gt "$CUR_SIZE" ]; then
                cp -f "$SRC_DIR/$DBF" "/var/lib/lms/$DBF"
                echo "  -> Migrated $DBF ($SRC_SIZE bytes) from $SRC_DIR"
            fi
        fi
    done
    if [ -d "$SRC_DIR/uploads" ]; then
        cp -rn "$SRC_DIR/uploads/"* "/var/lib/lms/uploads/" 2>/dev/null || true
    fi
done

# Auto-restore any missing or smaller database files from the largest backups in /var/backups/lms
if [ -d "/var/backups/lms" ]; then
    for BKP in $(ls -1S /var/backups/lms/*.tar.gz 2>/dev/null | head -n 5); do
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
                if [ "$BKP_SIZE" -gt "$CUR_SIZE" ]; then
                    cp -f "$FOUND_BKP_FILE" "/var/lib/lms/$DBF"
                    echo "✅ Restored $DBF ($BKP_SIZE bytes) from backup: $(basename "$BKP")"
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

echo "📂 Pulling latest code from GitHub and deploying to $WEB_ROOT..."
mkdir -p "$WEB_ROOT"
chmod 755 /var /var/www /var/www/html "$WEB_ROOT" 2>/dev/null || true

# If current directory is a git repository, pull latest changes first
if [ -d "./.git" ]; then
    echo "👉 Updating current git repository from origin/main..."
    git fetch origin main 2>/dev/null && git reset --hard origin/main 2>/dev/null || git pull origin main 2>/dev/null || true
fi

# Clone fresh from GitHub into /tmp so we always deploy a clean, complete copy
TMP_CLONE="/tmp/lms_clone_$$"
rm -rf "$TMP_CLONE"
if (cd /tmp && git clone https://github.com/dadad132/LMS "$TMP_CLONE" 2>/dev/null) && [ -f "$TMP_CLONE/index.html" ]; then
    echo "👉 Deploying fresh copy from GitHub to $WEB_ROOT..."
    cp -rf "$TMP_CLONE"/. "$WEB_ROOT/"
    rm -rf "$TMP_CLONE"
elif [ -f "./index.html" ] && [ -f "./api.py" ]; then
    rm -rf "$TMP_CLONE"
    if [ "$(cd . 2>/dev/null && pwd -P)" != "$(cd "$WEB_ROOT" 2>/dev/null && pwd -P)" ]; then
        echo "👉 Copying files from current directory to $WEB_ROOT..."
        cp -rf * "$WEB_ROOT/"
        if [ -d "./.well-known" ]; then
            cp -rf ./.well-known "$WEB_ROOT/"
        fi
    else
        echo "👉 Updating files in place in $WEB_ROOT..."
    fi
else
    rm -rf "$TMP_CLONE"
    echo "❌ Could not find website files to deploy."
    exit 1
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

# Keep /root/install.sh synced if it exists so running sudo bash install.sh from /root always uses the latest script
if [ -d "/root" ]; then
    cp -f "$WEB_ROOT/install.sh" /root/install.sh 2>/dev/null || true
    chmod +x /root/install.sh 2>/dev/null || true
fi

# Restore correct SELinux file context so Nginx and systemd can serve/execute these files
if command -v restorecon &>/dev/null; then
    restorecon -R "$WEB_ROOT" &>/dev/null || true
    restorecon -v /usr/local/bin/lms-api.py &>/dev/null || true
fi
echo "✅ Website files deployed."

# Step 4: Configure the secure Python API Background Daemon
echo "⚙️ Setting up backend API service daemon..."
rm -rf /etc/systemd/system/lms-api.service.d /usr/lib/systemd/system/lms-api.service /etc/systemd/system/lms.service 2>/dev/null || true
cat > /etc/systemd/system/lms-api.service << 'SERVICE'
[Unit]
Description=Honeypot Global Server API (LMS Website)
After=network.target

[Service]
Type=simple
User=root
Environment="PYTHONUNBUFFERED=1"
ExecStart=/usr/bin/python3 /usr/local/bin/lms-api.py
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
Alias=lms.service
SERVICE

chmod 644 /etc/systemd/system/lms-api.service
ln -sf /etc/systemd/system/lms-api.service /etc/systemd/system/lms.service
systemctl daemon-reload
systemctl reset-failed lms-api lms 2>/dev/null || true
systemctl stop lms-api 2>/dev/null || true
systemctl start lms-api
systemctl enable lms-api &>/dev/null

# Verify the API actually started
sleep 2
if systemctl is-active --quiet lms-api; then
    echo "✅ lms-api.service (and alias lms.service) daemon is active on port 8001."
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

# Copy and register diagnose utility
if [ -f "./diagnose.sh" ]; then
    cp -f "./diagnose.sh" /usr/local/bin/diagnose-lms
    chmod +x /usr/local/bin/diagnose-lms
    echo "✅ Diagnostic helper registered: diagnose-lms"
elif [ -f "$WEB_ROOT/diagnose.sh" ]; then
    cp -f "$WEB_ROOT/diagnose.sh" /usr/local/bin/diagnose-lms
    chmod +x /usr/local/bin/diagnose-lms
    echo "✅ Diagnostic helper registered: diagnose-lms"
fi

# Step 10: Final health check & detailed diagnostic report
echo ""
echo "🔍 Running final health check & writing detailed diagnostic log to /var/log/lms-diagnostic.log..."
sleep 1
API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8001/api/auth-status 2>/dev/null || echo "000")
if [ "$API_STATUS" = "200" ]; then
    echo "✅ API health check passed (HTTP $API_STATUS)"
else
    echo "⚠️  API health check returned HTTP $API_STATUS — check: journalctl -u lms-api -n 20"
fi

{
    echo "======================================================="
    echo "📋 HONEYPOT GLOBAL - DETAILED SERVER DIAGNOSTIC REPORT"
    echo "Generated: $(date)"
    echo "======================================================="
    echo ""
    echo "1) SYSTEMD SERVICE STATUS (lms / lms-api):"
    systemctl status lms-api --no-pager -l 2>&1 || true
    echo ""
    echo "2) AVAILABLE BACKUPS IN /var/backups/lms (Largest First):"
    ls -lhS /var/backups/lms/*.tar.gz 2>/dev/null || echo "   No .tar.gz archives found in /var/backups/lms"
    echo ""
    echo "3) ACTIVE DATABASE FILES IN /var/lib/lms:"
    ls -lh /var/lib/lms/ 2>/dev/null || true
    python3 - << 'PYEOF'
import os, json
data_dir = "/var/lib/lms"
for fname in ["users.json", "materials.json", "subjects.json", "modules.json", "team.json", "testimonials.json"]:
    fpath = os.path.join(data_dir, fname)
    if os.path.exists(fpath):
        try:
            with open(fpath, "r", encoding="utf-8") as f:
                data = json.load(f)
            count = len(data) if isinstance(data, (list, dict)) else 1
            print(f"   - {fname}: {os.path.getsize(fpath)} bytes ({count} records)")
        except Exception as e:
            print(f"   - {fname}: ERROR reading JSON ({e})")
    else:
        print(f"   - {fname}: MISSING")
uploads_dir = os.path.join(data_dir, "uploads")
if os.path.isdir(uploads_dir):
    files = os.listdir(uploads_dir)
    print(f"   - uploads/: {len(files)} uploaded files")
PYEOF
    echo ""
    echo "4) LIVE API ENDPOINT CHECK (http://127.0.0.1:8001/api/auth-status):"
    curl -s http://127.0.0.1:8001/api/auth-status | head -c 500 2>/dev/null || echo "   Failed to reach API"
    echo ""
    echo ""
    echo "======================================================="
} | tee /var/log/lms-diagnostic.log

# Step 11: Print Deployment Summary
IP=$(hostname -I | awk '{print $1}')
echo ""
echo "═══════════════════════════════════════════════════════"
echo " 🎉 INSTALLATION COMPLETE WITH AUTO-BACKUPS!"
echo "═══════════════════════════════════════════════════════"
echo ""
echo " 🌐 Domain:         https://honeypotglobal.co.za"
echo " 💻 Server IP:      http://$IP"
echo " 📄 Diagnostic Log: /var/log/lms-diagnostic.log"
echo " 📄 Live API Log:   /var/log/lms-api.log"
echo ""
echo " 💾 Backups Directory: $BACKUP_DIR/"
echo "    Run diagnostics at any time:   sudo bash diagnose.sh"
echo "    Restore previous data with:    restore-lms"
echo ""
echo "═══════════════════════════════════════════════════════"


