#!/usr/bin/env bash
# ==============================================================================
# Honeypot Nginx Reverse Proxy Configurator (SSL + Port 8001)
# ==============================================================================

echo "================================================================="
echo "🍯 Configuring Nginx Reverse Proxy with SSL (Port 8001)..."
echo "================================================================="

DOMAIN="honeypotglobal.co.za"
NGINX_CONF="/etc/nginx/conf.d/lms.conf"

# Check standard cert paths
SSL_CERT="/etc/letsencrypt/live/$DOMAIN/fullchain.pem"
SSL_KEY="/etc/letsencrypt/live/$DOMAIN/privkey.pem"

if [ ! -f "$SSL_CERT" ]; then
  # Try www subdomain path
  SSL_CERT="/etc/letsencrypt/live/www.$DOMAIN/fullchain.pem"
  SSL_KEY="/etc/letsencrypt/live/www.$DOMAIN/privkey.pem"
fi

if [ -f "$SSL_CERT" ] && [ -f "$SSL_KEY" ]; then
  echo "🔒 SSL certificates detected at $SSL_CERT. Writing HTTPS reverse proxy config..."
  cat <<EOF > "$NGINX_CONF"
server {
    listen 80;
    listen [::]:80;
    server_name honeypotglobal.co.za www.honeypotglobal.co.za;
    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name honeypotglobal.co.za www.honeypotglobal.co.za;

    ssl_certificate $SSL_CERT;
    ssl_certificate_key $SSL_KEY;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_session_tickets off;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;

    client_max_body_size 100M;

    location / {
        proxy_pass http://127.0.0.1:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    location /static {
        alias /opt/lms-website/app/static;
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }

    location /uploads {
        alias /opt/lms-website/uploads;
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }
}
EOF
else
  echo "⚠️ No SSL certificates detected. Writing HTTP-only reverse proxy config..."
  cat <<EOF > "$NGINX_CONF"
server {
    listen 80;
    listen [::]:80;
    server_name honeypotglobal.co.za www.honeypotglobal.co.za;

    client_max_body_size 100M;

    location / {
        proxy_pass http://127.0.0.1:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    location /static {
        alias /opt/lms-website/app/static;
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }

    location /uploads {
        alias /opt/lms-website/uploads;
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }
}
EOF
fi

# Test Nginx syntax
echo "⚙️ Testing Nginx syntax..."
nginx -t

if [ $? -eq 0 ]; then
  echo "🔄 Restarting Nginx..."
  systemctl restart nginx
  echo "================================================================="
  echo "🎉 SUCCESS! Your Python LMS website is now fully online!"
  echo "================================================================="
else
  echo "❌ Error: Nginx syntax test failed."
  exit 1
fi
