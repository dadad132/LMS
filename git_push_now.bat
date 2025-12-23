@echo off
cd /d C:\Users\admin\Documents\temp\Python\lms-website-builder
echo ========================================
echo Git Status:
echo ========================================
git status
echo.
echo ========================================
echo Last 5 Commits:
echo ========================================
git log --oneline -5
echo.
echo ========================================
echo Git Remote:
echo ========================================
git remote -v
echo.
echo ========================================
echo Staging all changes...
echo ========================================
git add .
echo.
echo ========================================
echo Committing...
echo ========================================
git commit -m "Add diagnostic and fix scripts for server troubleshooting"
echo.
echo ========================================
echo Pushing to origin main...
echo ========================================
git push origin main
echo.
echo ========================================
echo Done!
echo ========================================
pause
