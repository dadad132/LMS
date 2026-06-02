# Quick Restore - Pull backup from GitHub and restore it
# Usage: .\restore-from-backup.ps1 -Branch [branch-name] 
#        or .\restore-from-backup.ps1 -BackupFile [local-backup.zip]

param(
    [string]$Branch = "backup-v2-20260601",
    [string]$BackupFile = ""
)

if ($BackupFile) {
    # Restore from local backup file
    Write-Host "Restoring from local backup: $BackupFile" -ForegroundColor Yellow
    & .\backup-system.ps1 restore -BackupName (Split-Path $BackupFile -Leaf)
}
else {
    # Pull and restore from GitHub backup branch
    Write-Host "Fetching backup branch from GitHub: $Branch" -ForegroundColor Cyan
    git fetch origin $Branch
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Creating safety backup before restore..." -ForegroundColor Yellow
        & .\backup-system.ps1 backup | Out-Null
        
        Write-Host "Checking out backup branch: $Branch" -ForegroundColor Green
        git checkout -b temp-restore origin/$Branch --force
        
        # Copy files to main branch
        git checkout main
        git merge --allow-unrelated-histories -X theirs temp-restore -m "Restore from backup branch $Branch"
        git branch -D temp-restore
        
        Write-Host "Restore complete!" -ForegroundColor Green
        Write-Host "Current state restored from $Branch" -ForegroundColor Green
    }
    else {
        Write-Host "Failed to fetch branch: $Branch" -ForegroundColor Red
    }
}
