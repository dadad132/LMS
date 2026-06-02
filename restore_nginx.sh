#!/usr/bin/env bash
# ==============================================================================
# Honeypot Nginx Restorer & Port 8001 Fixer
# ==============================================================================

echo "================================================================="
echo "🍯 Restoring Nginx Reverse Proxy Configuration..."
echo "================================================================="

# 1. Locate the latest backup file
BACKUP_FILE=$(ls -t /etc/nginx/conf.d/lms.conf.backup.* 2>/dev/null | head -n 1)

if [ -z "$BACKUP_FILE" ]; then
  echo "❌ Error: No Nginx backup file found under /etc/nginx/conf.d/"
  exit 1
fi

echo "💾 Found backup file: $BACKUP_FILE"

# 2. Copy the backup file back to active lms.conf
echo "📦 Step 1: Copying backup to active configuration..."
cp "$BACKUP_FILE" /etc/nginx/conf.d/lms.conf

# 3. Ensure Nginx points to port 8001 (which Uvicorn is running on)
echo "🔧 Step 2: Ensuring Nginx points to port 8001..."
sed -i 's/8000/8001/g' /etc/nginx/conf.d/lms.conf

# 4. Test Nginx syntax
echo "⚙️ Step 3: Testing Nginx syntax..."
nginx -t

if [ $? -eq 0 ]; then
  echo "✅ Nginx syntax check passed."
  
  # 5. Restart Nginx
  echo "🔄 Step 4: Restarting Nginx server..."
  systemctl restart nginx
  echo "================================================================="
  echo "🎉 SUCCESS! Your LMS website is now fully online!"
  echo "👉 Visit: https://honeypotglobal.co.za"
  echo "================================================================="
else
  echo "❌ Error: Nginx configuration test failed."
  exit 1
fi
