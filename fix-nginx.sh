#!/bin/bash
# Fix Nginx Configuration Issues

echo "🔧 Fixing Nginx configuration..."

# Remove conflicting configs
sudo rm /etc/nginx/conf.d/default.conf 2>/dev/null || true
sudo rm /etc/nginx/sites-enabled/default 2>/dev/null || true

# Test Nginx config
echo "✓ Testing Nginx configuration..."
sudo nginx -t

# Reload Nginx
echo "✓ Reloading Nginx..."
sudo systemctl reload nginx

# Check status
echo "✓ Checking status..."
sudo systemctl status nginx

echo ""
echo "✓ Fix complete! Try your domain now."
