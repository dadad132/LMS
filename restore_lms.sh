#!/usr/bin/env bash
# ==============================================================================
# Honeypot LMS Restore & Diagnostics Script
# ==============================================================================

echo "================================================================="
echo "🍯 Restoring Honeypot LMS Python Backend Codebase..."
echo "================================================================="

# 1. Reset the local git repository back to the last commit containing the LMS Python codebase
echo "📦 Step 1: Reverting files to LMS Python codebase..."
git reset --hard 0928042796b9ea98ca95dee5edae52932107ffca^

# 2. Restart the LMS python service
echo "🔄 Step 2: Restarting LMS service..."
systemctl restart lms-website

# 3. Print LMS service status
echo "📊 Step 3: Checking service status..."
systemctl status lms-website --no-pager

# 4. Print logs to help diagnose the image upload crash
echo "📋 Step 4: Displaying recent LMS service error logs..."
echo "================================================================="
journalctl -u lms-website -n 50 --no-pager
echo "================================================================="
