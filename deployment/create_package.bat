@echo off
REM LMS Website Builder - Create Deployment Package for Ubuntu
REM This script creates a zip file ready to deploy to Ubuntu server

echo.
echo =========================================
echo   LMS Website Builder - Package Creator
echo =========================================
echo.

set SOURCE_DIR=%~dp0..
set PACKAGE_NAME=lms-website-builder-deploy
set OUTPUT_DIR=%USERPROFILE%\Desktop

echo Creating deployment package...
echo Source: %SOURCE_DIR%
echo Output: %OUTPUT_DIR%\%PACKAGE_NAME%.zip
echo.

REM Create temp directory
set TEMP_DIR=%TEMP%\%PACKAGE_NAME%
if exist "%TEMP_DIR%" rmdir /s /q "%TEMP_DIR%"
mkdir "%TEMP_DIR%"

REM Copy application files
echo Copying application files...
xcopy "%SOURCE_DIR%\app" "%TEMP_DIR%\app\" /E /I /Q
copy "%SOURCE_DIR%\requirements.txt" "%TEMP_DIR%\" >nul
copy "%SOURCE_DIR%\run.py" "%TEMP_DIR%\" >nul 2>&1
copy "%SOURCE_DIR%\run_public.py" "%TEMP_DIR%\" >nul 2>&1
copy "%SOURCE_DIR%\README.md" "%TEMP_DIR%\" >nul 2>&1

REM Copy deployment files
echo Copying deployment files...
xcopy "%SOURCE_DIR%\deployment" "%TEMP_DIR%\deployment\" /E /I /Q

REM Copy uploads folder if exists (for existing content)
if exist "%SOURCE_DIR%\uploads" (
    echo Copying uploads folder...
    xcopy "%SOURCE_DIR%\uploads" "%TEMP_DIR%\uploads\" /E /I /Q
)

REM Copy database if exists (optional - contains your data)
if exist "%SOURCE_DIR%\data.db" (
    echo Copying database...
    copy "%SOURCE_DIR%\data.db" "%TEMP_DIR%\" >nul
)

REM Create the zip file using PowerShell
echo.
echo Creating zip archive...
powershell -Command "Compress-Archive -Path '%TEMP_DIR%\*' -DestinationPath '%OUTPUT_DIR%\%PACKAGE_NAME%.zip' -Force"

REM Cleanup
rmdir /s /q "%TEMP_DIR%"

echo.
echo =========================================
echo   Package Created Successfully!
echo =========================================
echo.
echo Package location: %OUTPUT_DIR%\%PACKAGE_NAME%.zip
echo.
echo To deploy to Ubuntu:
echo   1. Copy the zip to your server:
echo      scp %PACKAGE_NAME%.zip user@server:/tmp/
echo.
echo   2. On the server, extract and install:
echo      cd /tmp
echo      unzip %PACKAGE_NAME%.zip -d lms-website-builder
echo      cd lms-website-builder/deployment
echo      chmod +x install_ubuntu.sh
echo      sudo ./install_ubuntu.sh
echo.
pause
