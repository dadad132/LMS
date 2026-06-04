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

# Search recursively in the temp folder
team_paths=$(find "$temp_extract" -name "team.json")
password_paths=$(find "$temp_extract" -name "admin_password.txt")

for p in $team_paths; do
    found_team="$p"
    break
done

for p in $password_paths; do
    found_password="$p"
    break
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

# Clean up temp
rm -rf "$temp_extract"

# Fix permissions
chmod 700 "$DATA_DIR"
if [ -f "$DATA_DIR/team.json" ]; then
    chmod 600 "$DATA_DIR/team.json"
fi
if [ -f "$DATA_DIR/admin_password.txt" ]; then
    chmod 600 "$DATA_DIR/admin_password.txt"
fi
chown -R root:root "$DATA_DIR"

# Restart API to load new files
echo "🔄 Restarting API service..."
systemctl restart lms-api

echo ""
echo "🎉 Restore process complete! Please refresh your website browser to verify your data."
