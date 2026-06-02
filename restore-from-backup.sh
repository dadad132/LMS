#!/bin/bash
# Quick Restore - Pull backup from GitHub and restore it
# AlmaLinux/Linux version
# Usage: ./restore-from-backup.sh [--branch branch-name] [--file backup-file.tar.gz]

BRANCH="backup-v2-20260601"
BACKUP_FILE=""

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --branch)
            BRANCH="$2"
            shift 2
            ;;
        --file)
            BACKUP_FILE="$2"
            shift 2
            ;;
        *)
            echo "Unknown option: $1"
            echo "Usage: $0 [--branch branch-name] [--file backup-file]"
            exit 1
            ;;
    esac
done

if [ -n "$BACKUP_FILE" ]; then
    # Restore from local backup file
    echo "Restoring from local backup: $BACKUP_FILE"
    ./backup-system.sh restore "$(basename "$BACKUP_FILE")"
else
    # Pull and restore from GitHub backup branch
    echo "Fetching backup branch from GitHub: $BRANCH"
    git fetch origin "$BRANCH"
    
    if [ $? -eq 0 ]; then
        echo "Creating safety backup before restore..."
        ./backup-system.sh backup > /dev/null
        
        echo "Checking out backup branch: $BRANCH"
        git checkout -b temp-restore origin/"$BRANCH" --force
        
        if [ $? -eq 0 ]; then
            # Copy files to main branch
            git checkout main
            git merge --allow-unrelated-histories -X theirs temp-restore -m "Restore from backup branch $BRANCH"
            git branch -D temp-restore
            
            echo "✓ Restore complete!"
            echo "Current state restored from $BRANCH"
        else
            echo "Error checking out branch"
            exit 1
        fi
    else
        echo "Failed to fetch branch: $BRANCH"
        exit 1
    fi
fi
