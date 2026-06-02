#!/bin/bash
# Backup System - Regular automated backups with restore capability
# Usage: ./backup-system.sh [backup|restore|list|schedule]
# AlmaLinux/Linux version

ACTION="${1:-backup}"
BACKUP_NAME="${2:-}"
BACKUP_DIR="./backups"

create_backup() {
    mkdir -p "$BACKUP_DIR"
    
    TIMESTAMP=$(date +"%Y-%m-%d_%H%M%S")
    COMMIT_HASH=$(git rev-parse --short HEAD)
    COMMIT_MSG=$(git log -1 --pretty=%B)
    BACKUP_FILE="$BACKUP_DIR/backup_${TIMESTAMP}_${COMMIT_HASH}.tar.gz"
    
    echo "Creating backup: $BACKUP_FILE"
    
    # Create tar.gz archive excluding .git for faster backups
    tar --exclude='.git' --exclude='backups' --exclude='*.sh' -czf "$BACKUP_FILE" .
    
    # Store metadata
    META_FILE="$BACKUP_DIR/backup_${TIMESTAMP}_${COMMIT_HASH}.meta"
    cat > "$META_FILE" << EOF
timestamp=$TIMESTAMP
commit=$COMMIT_HASH
message=$COMMIT_MSG
date=$(date)
EOF
    
    echo "✓ Backup created successfully!"
    echo "Location: $BACKUP_FILE"
    echo "$BACKUP_FILE"
}

list_backups() {
    if [ ! -d "$BACKUP_DIR" ]; then
        echo "No backups found."
        return
    fi
    
    echo ""
    echo "Available Backups:"
    for backup in "$BACKUP_DIR"/*.tar.gz; do
        if [ -f "$backup" ]; then
            filename=$(basename "$backup")
            metafile="${backup%.tar.gz}.meta"
            
            echo "  $filename"
            if [ -f "$metafile" ]; then
                while IFS='=' read -r key value; do
                    if [ "$key" != "message" ] && [ "$key" != "date" ]; then
                        echo "    $key: $value"
                    fi
                done < "$metafile"
            fi
        fi
    done
}

restore_backup() {
    if [ -z "$BACKUP_NAME" ]; then
        echo "Error: Please specify backup name"
        echo "Usage: $0 restore backup_YYYY-MM-DD_HHMMSS_HASH.tar.gz"
        list_backups
        return 1
    fi
    
    BACKUP_PATH="$BACKUP_DIR/$BACKUP_NAME"
    if [ ! -f "$BACKUP_PATH" ]; then
        echo "Backup not found: $BACKUP_PATH"
        return 1
    fi
    
    echo "Restoring from backup: $BACKUP_NAME"
    
    # Create safety backup first
    create_backup > /dev/null
    
    # Remove current files (excluding .git and backups)
    find . -maxdepth 1 \( ! -name '.git' ! -name 'backups' ! -name '*.sh' ! -name '.' \) -exec rm -rf {} + 2>/dev/null
    
    # Extract backup
    tar -xzf "$BACKUP_PATH" -C .
    
    echo "✓ Restore complete!"
    echo "A safety backup was created before restore in $BACKUP_DIR"
}

schedule_backup() {
    HOUR=22  # 10 PM
    MINUTE=0
    CRON_TIME="$MINUTE $HOUR * * *"
    SCRIPT_PATH=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/backup-system.sh
    
    echo "Setting up daily backup at $HOUR:00..."
    
    # Add to crontab
    (crontab -l 2>/dev/null; echo "$CRON_TIME $SCRIPT_PATH backup") | sort - | uniq - | crontab -
    
    if [ $? -eq 0 ]; then
        echo "✓ Cron job created successfully"
        echo "Backups will run daily at $HOUR:$MINUTE"
        echo ""
        echo "To view your cron jobs:"
        echo "  crontab -l"
        echo ""
        echo "To remove the scheduled backup:"
        echo "  crontab -e"
    else
        echo "Error setting up cron job. Make sure cron is running."
    fi
}

# Main execution
case "$ACTION" in
    backup)
        create_backup
        ;;
    list)
        list_backups
        ;;
    restore)
        restore_backup
        ;;
    schedule)
        schedule_backup
        ;;
    *)
        echo "LMS Backup System (AlmaLinux/Linux)"
        echo ""
        echo "Usage: $0 [action] [options]"
        echo ""
        echo "Actions:"
        echo "  backup                    Create a backup now"
        echo "  list                      List all backups"
        echo "  restore [filename]        Restore from backup"
        echo "  schedule                  Set up daily automated backups at 10 PM"
        echo ""
        echo "Examples:"
        echo "  $0 backup"
        echo "  $0 list"
        echo "  $0 restore backup_2026-06-02_220000_abc123.tar.gz"
        echo "  $0 schedule"
        echo ""
        echo "Documentation: See BACKUP_RESTORE_README.md"
        ;;
esac
