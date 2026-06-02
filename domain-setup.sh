#!/bin/bash
# Domain Setup for honeypotglobal.co.za
# Follow these steps to point your domain to your server

IP=$(hostname -I | awk '{print $1}')

cat << EOF

╔════════════════════════════════════════════════════════════════╗
║       Setup honeypotglobal.co.za to point to your server      ║
╚════════════════════════════════════════════════════════════════╝

YOUR SERVER IP: $IP

STEP 1: Go to domains.co.za
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Log in to domains.co.za
2. Find "Manage Domains" or "My Domains"
3. Click on: honeypotglobal.co.za

STEP 2: Update DNS A Record
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Find the DNS/Name Server section and look for:
  - DNS Records
  - Edit DNS
  - Manage Records

STEP 3: Create/Edit A Record
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Set:
  Type:     A
  Name:     @  (or honeypotglobal.co.za)
  Value:    $IP
  TTL:      3600

STEP 4: Save and Wait
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DNS changes take 5-30 minutes to work globally.

Then visit:
  https://honeypotglobal.co.za

✅ Done!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

EOF
