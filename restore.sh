#!/bin/bash
# Honeypot Global - Backup Restore Utility
# Run: sudo bash restore.sh

# Ensure script is run as root
if [ "$EUID" -ne 0 ]; then
    echo "❌ Please run this script with sudo:"
    echo "   sudo bash restore.sh"
    exit 1
fi

BACKUP_DIR="/var/backups/lms"
DATA_DIR="/var/lib/lms"

echo "🍯 Honeypot Global Backup Restore Utility"
echo "=========================================="

if [ ! -d "$BACKUP_DIR" ] || [ -z "$(ls -A "$BACKUP_DIR" 2>/dev/null)" ]; then
    echo "❌ No backups found in $BACKUP_DIR"
    exit 1
fi

echo "Available Backups:"
echo "------------------"
# List backups with numbers
backups=($(ls -t "$BACKUP_DIR"/honeypot_backup_*.tar.gz 2>/dev/null))
legacy_backups=($(ls -t "$BACKUP_DIR"/backup_*.tar.gz 2>/dev/null))

# Merge lists, showing newer first
all_backups=("${backups[@]}" "${legacy_backups[@]}")

if [ ${#all_backups[@]} -eq 0 ]; then
    echo "❌ No valid backup archive files found."
    exit 1
fi

for i in "${!all_backups[@]}"; do
    filename=$(basename "${all_backups[$i]}")
    filesize=$(du -sh "${all_backups[$i]}" | cut -f1)
    filedate=$(date -r "${all_backups[$i]}" "+%Y-%m-%d %H:%M:%S")
    echo "  [$((i+1))] $filename ($filesize) - Saved: $filedate"
done

echo ""
read -p "Select a backup to restore (1-${#all_backups[@]}) or press Enter to cancel: " choice

if [ -z "$choice" ] || ! [[ "$choice" =~ ^[0-9]+$ ]] || [ "$choice" -lt 1 ] || [ "$choice" -gt ${#all_backups[@]} ]; then
    echo "❌ Restore cancelled."
    exit 1
fi

selected_backup="${all_backups[$((choice-1))]}"
echo ""
echo "⏳ Restoring from: $(basename "$selected_backup")..."

# Ensure destination exists
mkdir -p "$DATA_DIR"

# Temporary directory for extraction
temp_extract="/tmp/lms-restore-$$"
mkdir -p "$temp_extract"

# Extract
tar -xzf "$selected_backup" -C "$temp_extract" 2>/dev/null

# Detect where team.json is located in the archive
# Older backups had it in opt/lms-website/ or var/www/html/lms/
# Newer backups have it at root (from -C /var/lib/lms)
found_team=""
found_password=""
found_users=""
found_materials=""
found_uploads=""

# Search recursively in the temp folder
team_paths=$(find "$temp_extract" -name "team.json")
password_paths=$(find "$temp_extract" -name "admin_password.txt")
users_paths=$(find "$temp_extract" -name "users.json")
materials_paths=$(find "$temp_extract" -name "materials.json")
uploads_paths=$(find "$temp_extract" -type d -name "uploads")

for p in $team_paths; do
    found_team="$p"
    break
done

for p in $password_paths; do
    found_password="$p"
    break
done

for p in $users_paths; do
    found_users="$p"
    break
done

for p in $materials_paths; do
    found_materials="$p"
    break
done

for p in $uploads_paths; do
    # Ensure it's not the temp_extract root directory itself if it's named uploads somehow
    if [ "$(basename "$p")" = "uploads" ]; then
        found_uploads="$p"
        break
    fi
done

if [ -n "$found_team" ]; then
    cp -f "$found_team" "$DATA_DIR/team.json"
    echo "✅ Restored team.json profiles."
else
    echo "⚠️  team.json not found in this backup archive."
fi

if [ -n "$found_password" ]; then
    cp -f "$found_password" "$DATA_DIR/admin_password.txt"
    echo "✅ Restored admin_password.txt credentials."
else
    echo "⚠️  admin_password.txt not found in this backup archive."
fi

if [ -n "$found_users" ]; then
    cp -f "$found_users" "$DATA_DIR/users.json"
    echo "✅ Restored users.json student/admin accounts."
else
    echo "⚠️  users.json not found in this backup archive."
fi

if [ -n "$found_materials" ]; then
    cp -f "$found_materials" "$DATA_DIR/materials.json"
    echo "✅ Restored materials.json study resources metadata."
else
    echo "⚠️  materials.json not found in this backup archive."
fi

if [ -n "$found_uploads" ]; then
    mkdir -p "$DATA_DIR/uploads"
    cp -rf "$found_uploads"/. "$DATA_DIR/uploads/"
    echo "✅ Restored uploads/ study documents and files."
else
    echo "⚠️  uploads/ directory not found in this backup archive."
fi

# Clean up temp
rm -rf "$temp_extract"

# Fix permissions to ensure secure access while allowing Nginx to serve uploads
chmod 755 "$DATA_DIR"
if [ -d "$DATA_DIR/uploads" ]; then
    chmod 755 "$DATA_DIR/uploads"
    find "$DATA_DIR/uploads" -type f -exec chmod 644 {} \; 2>/dev/null || true
fi

for f in team.json admin_password.txt users.json materials.json; do
    if [ -f "$DATA_DIR/$f" ]; then
        chmod 600 "$DATA_DIR/$f"
    fi
done

chown -R root:root "$DATA_DIR"

# Restore correct SELinux context for uploads
if command -v restorecon &>/dev/null; then
    restorecon -R "$DATA_DIR/uploads" &>/dev/null || true
fi

# Restart API to load new files
echo "🔄 Restarting API service..."
systemctl restart lms-api

echo ""
echo "🎉 Restore process complete! Please refresh your website browser to verify your data."
