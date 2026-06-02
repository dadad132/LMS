#!/bin/bash
# DNS Setup Guide for honeypotglobal.co.za
# This file contains the steps to point your domain to your server

cat << 'EOF'

╔════════════════════════════════════════════════════════════════╗
║        DOMAIN DNS SETUP - honeypotglobal.co.za               ║
║   Point your domain to your AlmaLinux server                 ║
╚════════════════════════════════════════════════════════════════╝

STEP 1: Find Your Server's IP Address
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Run this command on your server:

  hostname -I

Copy the IP address shown (e.g., 192.168.1.100 or 203.0.113.45)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

STEP 2: Go to Your Domain Registrar
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
You registered honeypotglobal.co.za at a registrar like:
  - Namecheap
  - GoDaddy
  - Domain.co.za
  - Register.co.za
  - Or any other South African registrar

Log in to your registrar's website and find:
  - "DNS Settings" or "Manage DNS"
  - "Name Servers" or "DNS Records"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

STEP 3: Update the A Record
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Find or create an "A Record" with:

  Name/Host:  @  (or leave blank/honeypotglobal.co.za)
  Type:       A
  Value/IP:   YOUR_SERVER_IP_ADDRESS (from Step 1)
  TTL:        3600 (or default)

Example:
  ┌─────────────────────────────────────┐
  │ Type  │ Name │ Value       │ TTL   │
  ├─────────────────────────────────────┤
  │ A     │ @    │ 203.0.113.45│ 3600  │
  └─────────────────────────────────────┘

ALSO add a www record (optional but recommended):
  Name:   www
  Type:   A
  Value:  YOUR_SERVER_IP_ADDRESS
  TTL:    3600

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

STEP 4: Wait for DNS to Propagate
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DNS changes can take 5 minutes to 48 hours to propagate globally.

Check if it's working:

  On your computer (any OS):
    ping honeypotglobal.co.za

  Should show your server's IP address.

  Or check online at:
    https://dns-lookup.com/
    https://www.whatsmydns.net/

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

STEP 5: Test Your Website
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Once DNS is working, go to:

  http://honeypotglobal.co.za

You should see your website!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

OPTIONAL: Enable HTTPS (SSL)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Once DNS is working and website is accessible, run:

  sudo certbot --nginx -d honeypotglobal.co.za -d www.honeypotglobal.co.za

This adds a free SSL certificate and redirects HTTP → HTTPS

Then your site will be:
  https://honeypotglobal.co.za (secure!)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TROUBLESHOOTING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Q: Still seeing "DNS_PROBE_FINISHED_NXDOMAIN"?
A: DNS hasn't propagated yet, wait 5-10 minutes and refresh

Q: How do I know my A record is set correctly?
A: Run on any computer:
   nslookup honeypotglobal.co.za
   Should show your server's IP

Q: Website still not showing?
A: Check if Nginx is running on server:
   sudo systemctl status nginx
   sudo nginx -t

Q: Can't find DNS settings at registrar?
A: Search their help for "How to change DNS records"
   or contact their support

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

EOF
