#!/bin/bash
# Restore to original working website
# Reverts changes and deploys only the HTML files (commit #2)

set -e

echo "🔄 Restoring original working website..."

cd /opt/lms

# Checkout commit #2 (the working version)
git checkout 0928042

# Copy ONLY the necessary files to web root (not .git, not scripts)
WEB_ROOT="/var/www/html/lms"
rm -rf "$WEB_ROOT"
mkdir -p "$WEB_ROOT"

# Copy everything EXCEPT .git and scripts
find . -maxdepth 1 \
    ! -name '.git' \
    ! -name '*.sh' \
    ! -name 'backups' \
    ! -name '.' \
    ! -name '..' \
    -exec cp -r {} "$WEB_ROOT/" \;

# Set permissions
chown -R nginx:nginx "$WEB_ROOT"
chmod -R 755 "$WEB_ROOT"

# Reload Nginx
sudo systemctl reload nginx

echo "✓ Original website restored!"
echo "✓ Website should now be live at your domain"
echo ""
echo "Access: http://honeypotglobal.co.za"
