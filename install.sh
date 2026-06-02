#!/bin/bash
# Honeypot Global - One-Click AlmaLinux Installer
# Run: sudo bash install.sh

# Ensure script is run as root
if [ "$EUID" -ne 0 ]; then
    echo "❌ Please run this script with sudo:"
    echo "   sudo bash install.sh"
    exit 1
fi

echo "🚀 Starting Honeypot Global Static Website Installer..."
echo "====================================================="

# Step 1: Clean up old Flask services if they exist
echo "🧹 Cleaning up legacy services (if any)..."
if systemctl is-active --quiet lms-website; then
    sudo systemctl stop lms-website 2>/dev/null || true
fi
if systemctl is-enabled --quiet lms-website; then
    sudo systemctl disable lms-website 2>/dev/null || true
fi
sudo rm -f /etc/systemd/system/lms-website.service
sudo systemctl daemon-reload

# Step 2: Install Git & Nginx if they are missing
echo "🔧 Installing system dependencies (git, nginx)..."
if ! command -v git &>/dev/null; then
    echo "👉 Installing git..."
    dnf install -y git &>/dev/null
fi

if ! command -v nginx &>/dev/null; then
    echo "👉 Installing nginx..."
    dnf install -y nginx &>/dev/null
fi
echo "✅ Dependencies ready."

# Step 3: Deploy the static site to the web root
WEB_ROOT="/var/www/html/lms"
echo "📂 Deploying website files to $WEB_ROOT..."

# If running from inside a cloned repo, copy local files, otherwise clone
if [ -f "./index.html" ]; then
    echo "👉 Copying files from current directory..."
    sudo mkdir -p "$WEB_ROOT"
    sudo cp -rf * "$WEB_ROOT/"
else
    echo "👉 Cloning files from GitHub..."
    sudo rm -rf "$WEB_ROOT"
    sudo git clone https://github.com/dadad132/LMS "$WEB_ROOT"
fi
echo "✅ Website files deployed successfully."

# Step 4: Configure Nginx Server Block with Domain name
echo "🌐 Configuring Nginx for domain: honeypotglobal.co.za..."
sudo rm -f /etc/nginx/conf.d/default.conf
sudo rm -f /etc/nginx/conf.d/lms.conf

sudo tee /etc/nginx/conf.d/lms.conf << 'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name honeypotglobal.co.za www.honeypotglobal.co.za;

    root /var/www/html/lms;
    index index.html;

    location / {
        try_files $uri $uri/ =404;
    }
}
EOF
echo "✅ Nginx server block configured."

# Step 5: Test & Restart Nginx
echo "🔄 Starting Nginx web server..."
if sudo nginx -t &>/dev/null; then
    sudo systemctl restart nginx
    sudo systemctl enable nginx &>/dev/null
    echo "✅ Nginx restarted successfully!"
else
    echo "❌ Nginx configuration test failed! Please check your Nginx setup manually."
    exit 1
fi

# Step 6: Print Deployment Summary
IP=$(hostname -I | awk '{print $1}')
echo ""
echo "═══════════════════════════════════════════════════════"
echo " 🎉 INSTALLATION COMPLETE!"
echo "═══════════════════════════════════════════════════════"
echo ""
echo " 🌐 Domain:  http://honeypotglobal.co.za"
echo " 💻 Server IP: http://$IP"
echo ""
echo " 💡 DNS Reminder:"
echo "    Please make sure you have added an 'A record' pointing"
echo "    honeypotglobal.co.za to your Server IP: $IP"
echo ""
echo "═══════════════════════════════════════════════════════"
