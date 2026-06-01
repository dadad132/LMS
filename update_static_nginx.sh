#!/usr/bin/env bash
# ==============================================================================
# Honeypot Global Static Nginx Updater for AlmaLinux
# ==============================================================================
# Run as root or with sudo: sudo bash update_static_nginx.sh
# ==============================================================================

# Ensure script is run with root privileges
if [ "$EUID" -ne 0 ]; then
  echo "❌ Error: Please run this script with sudo or as root: sudo bash $0"
  exit 1
fi

echo "================================================================="
echo "🍯 Honeypot Global: Auto-Deploying Static Website..."
echo "================================================================="

# 1. Stop and disable the old Python background service
echo "📦 Step 1: Terminating old Python application service..."
systemctl stop lms 2>/dev/null
systemctl disable lms 2>/dev/null
echo "✅ Old service stopped and disabled successfully."

# 2. Determine project root directory path
PROJECT_DIR="$(pwd)"
echo "📂 Project root detected at: $PROJECT_DIR"

# 3. Locate Nginx configuration file
NGINX_CONF="/etc/nginx/conf.d/lms.conf"
echo "🔍 Targeting Nginx config: $NGINX_CONF"

# 4. Back up current Nginx configuration
if [ -f "$NGINX_CONF" ]; then
  echo "💾 Backing up existing Nginx configuration..."
  cp "$NGINX_CONF" "${NGINX_CONF}.backup.$(date +%F_%T)"
fi

# 5. Overwrite Nginx configuration with clean static config rules
echo "✍️ Overwriting Nginx configuration..."
cat <<EOF > "$NGINX_CONF"
# ==============================================================================
# Honeypot Global Static Website Configuration
# ==============================================================================
server {
    listen 80;
    listen [::]:80;
    server_name honeypotglobal.co.za www.honeypotglobal.co.za;

    root $PROJECT_DIR;
    index index.html;

    # Enable gzip compression for lightning-fast loads
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml;

    location / {
        try_files \$uri \$uri/ =404;
    }

    # Cache static visual assets for 30 days
    location ~* \.(jpg|jpeg|png|gif|ico|css|js)\$ {
        expires 30d;
        add_header Cache-Control "public, no-transform";
        access_log off;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
}
EOF

echo "✅ Nginx config written successfully!"

# 6. Test Nginx Configuration
echo "⚙️ Step 4: Testing Nginx syntax..."
nginx -t
if [ $? -eq 0 ]; then
  echo "✅ Nginx syntax check passed."
  
  # 7. Reload Nginx
  echo "🔄 Step 5: Reloading Nginx server..."
  systemctl restart nginx
  echo "================================================================="
  echo "🎉 SUCCESS! Your premium Honeypot Global site is now 100% live!"
  echo "👉 Visit: http://honeypotglobal.co.za"
  echo "================================================================="
else
  echo "❌ Error: Nginx configuration test failed. Restoring backup..."
  # Find latest backup
  LATEST_BACKUP=$(ls -t ${NGINX_CONF}.backup.* 2>/dev/null | head -n 1)
  if [ -n "$LATEST_BACKUP" ]; then
    cp "$LATEST_BACKUP" "$NGINX_CONF"
    echo "💾 Restored backup from: $LATEST_BACKUP"
    systemctl restart nginx
  fi
  exit 1
fi
