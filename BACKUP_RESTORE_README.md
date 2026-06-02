# Backup & Restore System

This repository includes automated backup and restore capabilities to protect against unwanted changes.

## Overview

- **Local Backups**: Timestamped archives stored in `./backups/` folder
  - Windows: ZIP format via `backup-system.ps1`
  - Linux/AlmaLinux: TAR.GZ format via `backup-system.sh`
- **GitHub Backups**: Backup branches pushed to GitHub for cloud storage
- **Automated Scheduling**: Optional daily backups at 10 PM

## Platform Support

Choose the appropriate scripts for your platform:

| Platform | Main Script | Restore Script |
|----------|------------|-----------------|
| **Windows** | `backup-system.ps1` | `restore-from-backup.ps1` |
| **Linux/AlmaLinux** | `backup-system.sh` | `restore-from-backup.sh` |

---

## AlmaLinux Server Setup

### Initial Setup
1. Clone/pull the repository on your AlmaLinux server
2. Ensure you have `git` installed:
   ```bash
   sudo dnf install git -y
   ```

3. Make scripts executable:
   ```bash
   cd /path/to/lms
   chmod +x backup-system.sh restore-from-backup.sh
   ```

4. Verify git access (optional - configure SSH key if needed)

### Enable SSH Key for GitHub (Optional)
If your repository uses SSH instead of HTTPS:
```bash
ssh-keygen -t ed25519 -C "your-email@example.com"
cat ~/.ssh/id_ed25519.pub  # Add this to GitHub SSH keys
ssh -T git@github.com      # Test connection
```

### Test the Backup System
```bash
./backup-system.sh backup
./backup-system.sh list
```

### Set Up Automatic Daily Backups
```bash
./backup-system.sh schedule
```

Verify the cron job was added:
```bash
crontab -l
```

---

### Windows

#### Create Backup Now
```powershell
.\backup-system.ps1 backup
```

#### List All Backups
```powershell
.\backup-system.ps1 list
```

#### Restore from Local Backup
```powershell
.\backup-system.ps1 restore -BackupName backup_2026-06-02_220000_abc123.zip
```

#### Restore from GitHub Backup Branch
```powershell
.\restore-from-backup.ps1 -Branch backup-v2-20260601
```

#### Set Up Daily Automated Backups
```powershell
.\backup-system.ps1 schedule
```
*(Requires Administrator privileges)*

---

### Linux / AlmaLinux

First, make the scripts executable:
```bash
chmod +x backup-system.sh restore-from-backup.sh
```

#### Create Backup Now
```bash
./backup-system.sh backup
```

#### List All Backups
```bash
./backup-system.sh list
```

#### Restore from Local Backup
```bash
./backup-system.sh restore backup_2026-06-02_220000_abc123.tar.gz
```

#### Restore from GitHub Backup Branch
```bash
./restore-from-backup.sh --branch backup-v2-20260601
```

#### Set Up Daily Automated Backups
```bash
./backup-system.sh schedule
```
*(Sets up cron job to run daily at 10 PM)*

## How It Works

### Local Backup Storage
- Location: `./backups/` directory
- Format: `backup_YYYY-MM-DD_HHmmss_COMMITHASH.zip`
- Metadata: `.meta` files contain timestamp, commit info, and file count
- Auto-safe: Creates a safety backup before every restore

### GitHub Backup Branches
- Backup branches are named: `backup-v2-YYYYMMDD`
- Current v2 snapshot: `backup-v2-20260601`
- Pull anytime to download: `git clone --branch backup-v2-20260601 https://github.com/dadad132/LMS`

### Workflow

1. **Daily Operation**: Code changes are made normally
2. **Manual Backup**: Run `.\backup-system.ps1 backup` before risky changes
3. **Auto Backup** *(optional)*: Daily scheduled backup at 10 PM if enabled
4. **Need to Revert?**:
   - Local: `.\backup-system.ps1 restore -BackupName [file]`
   - GitHub: `.\restore-from-backup.ps1 -Branch [branch]`
5. **Safety First**: A backup is automatically created before any restore

## Download Backups

### From Local
```powershell
# List all backups
.\backup-system.ps1 list

# Backups are in ./backups/ - copy any .zip file to download
```

### From GitHub
```powershell
# Clone a specific backup branch
git clone --branch backup-v2-20260601 https://github.com/dadad132/LMS my-backup

# Or download as zip from GitHub UI
# https://github.com/dadad132/LMS/tree/backup-v2-20260601
```

## Example Scenarios

### Scenario 1: Undo Recent Changes

**Windows:**
```powershell
# List recent backups
.\backup-system.ps1 list

# Restore the one before your mistake
.\backup-system.ps1 restore -BackupName backup_2026-06-02_200000_abc123.zip
```

**Linux/AlmaLinux:**
```bash
# List recent backups
./backup-system.sh list

# Restore the one before your mistake
./backup-system.sh restore backup_2026-06-02_200000_abc123.tar.gz
```

### Scenario 2: Recovery from Cloud

**Windows:**
```powershell
# Pull the backup branch from GitHub
.\restore-from-backup.ps1 -Branch backup-v2-20260601

# Or clone the backup branch into a new folder
git clone --branch backup-v2-20260601 https://github.com/dadad132/LMS recovery-folder
```

**Linux/AlmaLinux:**
```bash
# Pull the backup branch from GitHub
./restore-from-backup.sh --branch backup-v2-20260601

# Or clone the backup branch into a new folder
git clone --branch backup-v2-20260601 https://github.com/dadad132/LMS recovery-folder
```

### Scenario 3: Push Restored State to GitHub

**Both platforms:**
```bash
# After restoring, update GitHub with new backup branch
git checkout -b backup-v2-NEW-DATE
git push -u origin backup-v2-NEW-DATE
```

## Backup Retention

Backups are kept indefinitely in:
- **Local**: `./backups/` folder (manage manually or set up cleanup script)
- **GitHub**: Backup branches persist until manually deleted

To clean up old backups:
```powershell
# Delete local backup
Remove-Item .\backups\backup_OLD_*.zip, .\backups\backup_OLD_*.meta

# Delete GitHub branch
git push origin --delete backup-v2-OLD-DATE
```

## Troubleshooting

### Windows

**"Access Denied" Error When Scheduling**
Run PowerShell as Administrator before running `.\backup-system.ps1 schedule`

**Restore Failed**
A safety backup is always created first. Check `.\backups/` for the most recent backup to restore from instead.

**Can't Find a Backup?**
```powershell
# List all available GitHub branches
git branch -r

# List local backups
Get-ChildItem .\backups\
```

### Linux / AlmaLinux

**"Permission Denied" When Running Script**
Make sure scripts are executable:
```bash
chmod +x backup-system.sh restore-from-backup.sh
./backup-system.sh backup
```

**Cron Job Not Running**
Check if cron service is active:
```bash
sudo systemctl status crond
sudo systemctl start crond      # Start if not running
sudo systemctl enable crond     # Enable on boot
```

View your cron jobs:
```bash
crontab -l
```

View cron logs:
```bash
sudo tail -f /var/log/cron
```

**Restore Failed**
A safety backup is always created first. Check `./backups/` for the most recent backup:
```bash
ls -lh ./backups/
./backup-system.sh list
```

**Can't Find a Backup?**
```bash
# List all available GitHub branches
git branch -r

# List local backups with full details
ls -lh ./backups/
```

**Git SSH Permission Issues**
If using SSH URLs instead of HTTPS:
```bash
ssh -T git@github.com              # Test SSH connection
ssh-add ~/.ssh/id_ed25519         # Add SSH key to agent
```

---

**Current Backup Branches on GitHub:**
- `backup-v2-20260601` - Snapshot from June 1, 2026 at 8:40 PM
