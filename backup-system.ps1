# Backup System - Regular automated backups with restore capability
# Usage: .\backup-system.ps1 [backup|restore|list|schedule]

param(
    [string]$Action = "backup",
    [string]$BackupName = "",
    [string]$BackupDir = ".\backups"
)

function Create-Backup {
    if (-not (Test-Path $BackupDir)) {
        New-Item -ItemType Directory -Path $BackupDir | Out-Null
    }
    
    $timestamp = Get-Date -Format "yyyy-MM-dd_HHmmss"
    $commitHash = git rev-parse --short HEAD
    $commitMsg = git log -1 --pretty=%B
    $backupName = "$BackupDir\backup_${timestamp}_${commitHash}.zip"
    
    Write-Host "Creating backup: $backupName" -ForegroundColor Green
    
    # Create zip archive excluding .git for faster backups
    $files = Get-ChildItem -Exclude @('.git', 'backups', '.gitignore')
    Compress-Archive -Path $files -DestinationPath $backupName -Force
    
    # Store metadata
    $metaFile = "$BackupDir\backup_${timestamp}_${commitHash}.meta"
    @{
        timestamp = $timestamp
        commit = $commitHash
        message = $commitMsg
        files = (Get-ChildItem -Recurse | Measure-Object).Count
    } | ConvertTo-Json | Set-Content $metaFile
    
    Write-Host "Backup created successfully!" -ForegroundColor Green
    Write-Host "Location: $backupName"
    return $backupName
}

function List-Backups {
    if (-not (Test-Path $BackupDir)) {
        Write-Host "No backups found." -ForegroundColor Yellow
        return
    }
    
    Write-Host "`nAvailable Backups:" -ForegroundColor Cyan
    Get-ChildItem "$BackupDir\*.zip" | ForEach-Object {
        $metaFile = $_.FullName -replace '\.zip$', '.meta'
        if (Test-Path $metaFile) {
            $meta = Get-Content $metaFile | ConvertFrom-Json
            Write-Host "  $($_.Name)" -ForegroundColor Green
            Write-Host "    Timestamp: $($meta.timestamp)" -ForegroundColor Gray
            Write-Host "    Commit: $($meta.commit)" -ForegroundColor Gray
            Write-Host "    Message: $($meta.message)" -ForegroundColor Gray
        }
    }
}

function Restore-Backup {
    if (-not $BackupName) {
        Write-Host "Error: Please specify backup name with -BackupName parameter" -ForegroundColor Red
        List-Backups
        return
    }
    
    $backupPath = "$BackupDir\$BackupName"
    if (-not (Test-Path $backupPath)) {
        Write-Host "Backup not found: $backupPath" -ForegroundColor Red
        return
    }
    
    Write-Host "Restoring from backup: $BackupName" -ForegroundColor Yellow
    
    # Create safety backup first
    Create-Backup | Out-Null
    
    # Remove current files (excluding .git and backups)
    Get-ChildItem -Exclude @('.git', 'backups', 'backup-system.ps1', '.gitignore') | Remove-Item -Recurse -Force
    
    # Extract backup
    Expand-Archive -Path $backupPath -DestinationPath "." -Force
    
    Write-Host "Restore complete!" -ForegroundColor Green
    Write-Host "A safety backup was created before restore in $BackupDir" -ForegroundColor Green
}

function Schedule-Backup {
    $hour = 22  # 10 PM
    Write-Host "Setting up daily backup at $hour`:00..." -ForegroundColor Cyan
    
    $taskName = "LMS-DailyBackup"
    $scriptPath = (Resolve-Path $PSCommandPath).Path
    $action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$scriptPath`" backup"
    $trigger = New-ScheduledTaskTrigger -Daily -At "$($hour):00"
    
    try {
        Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Force -ErrorAction Stop
        Write-Host "Scheduled task created: $taskName" -ForegroundColor Green
        Write-Host "Backups will run daily at $($hour):00" -ForegroundColor Green
    }
    catch {
        Write-Host "Error scheduling task. You may need to run as Administrator." -ForegroundColor Red
    }
}

# Main execution
switch ($Action.ToLower()) {
    "backup" { Create-Backup }
    "list" { List-Backups }
    "restore" { Restore-Backup }
    "schedule" { Schedule-Backup }
    default {
        Write-Host "LMS Backup System" -ForegroundColor Cyan
        Write-Host "`nUsage: .\backup-system.ps1 [action]" -ForegroundColor Yellow
        Write-Host "`nActions:"
        Write-Host "  backup              Create a backup now"
        Write-Host "  list                List all backups"
        Write-Host "  restore -BackupName [file.zip]  Restore from backup"
        Write-Host "  schedule            Set up daily automated backups at 10 PM"
        Write-Host "`nExamples:"
        Write-Host "  .\backup-system.ps1 backup"
        Write-Host "  .\backup-system.ps1 list"
        Write-Host "  .\backup-system.ps1 restore -BackupName backup_2026-06-02_220000_abc123.zip"
        Write-Host "  .\backup-system.ps1 schedule"
    }
}
