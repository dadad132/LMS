# ==============================================================
# LMS Website Builder - AlmaLinux 10 Deployment Guide
# ==============================================================

## Quick Start

### Option 1: Automated Installation

1. Upload all files to your AlmaLinux server
2. Run the installation script:

```bash
sudo bash deploy/almalinux/install.sh
```

3. Follow the prompts

### Option 2: Manual Installation

Follow the steps below.

---

## Prerequisites

- AlmaLinux 10 (or RHEL 10 / Rocky Linux 10)
- Root or sudo access
- A domain name pointed to your server
- At least 1GB RAM, 10GB disk space

---

## Step-by-Step Installation

### 1. Update System & Install Dependencies

```bash
sudo dnf update -y
sudo dnf install -y epel-release
sudo dnf install -y python3.11 python3.11-pip python3.11-devel \
    nginx git gcc make openssl-devel libffi-devel sqlite \
    certbot python3-certbot-nginx firewalld
```

### 2. Create Application User

```bash
sudo useradd -r -m -s /bin/bash lmsuser
```

### 3. Set Up Application Directory

```bash
sudo mkdir -p /var/www/lms
sudo mkdir -p /var/www/lms/{logs,backups}
sudo mkdir -p /var/www/lms/uploads/{general,site,Video,Info}
```

### 4. Upload Application Files

Upload your application files to `/var/www/lms/`:

```
/var/www/lms/
├── app/
│   ├── __init__.py
│   ├── main.py
│   ├── config.py
│   ├── database.py
│   ├── diagnostics.py
│   ├── api/
│   ├── models/
│   ├── static/
│   └── templates/
├── requirements.txt
├── run.py
└── uploads/
```

Or clone from Git:

```bash
cd /var/www
sudo git clone https://github.com/YOUR_USERNAME/lms-website-builder.git lms
```

Set ownership:

```bash
sudo chown -R lmsuser:lmsuser /var/www/lms
```

### 5. Create Python Virtual Environment

```bash
sudo -u lmsuser bash
cd /var/www/lms
python3.11 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
pip install gunicorn
exit
```

### 6. Create Systemd Service

Create `/etc/systemd/system/lms.service`:

```ini
[Unit]
Description=LMS Website Builder
After=network.target

[Service]
Type=simple
User=lmsuser
Group=lmsuser
WorkingDirectory=/var/www/lms
Environment="PATH=/var/www/lms/venv/bin"
Environment="SECRET_KEY=your-secret-key-here-change-this"
Environment="ADMIN_SECRET_PATH=your-secret-admin-path"
ExecStart=/var/www/lms/venv/bin/gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker -b 127.0.0.1:8000
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Generate a secure secret key:

```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
```

Enable and start the service:

```bash
sudo systemctl daemon-reload
sudo systemctl enable lms
sudo systemctl start lms
```

### 7. Configure Nginx

Create `/etc/nginx/conf.d/lms.conf`:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    
    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
    }
    
    location /static {
        alias /var/www/lms/app/static;
        expires 30d;
    }
    
    location /uploads {
        alias /var/www/lms/uploads;
        expires 30d;
    }
    
    client_max_body_size 100M;
}
```

Test and restart Nginx:

```bash
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx
```

### 8. Configure Firewall

```bash
sudo systemctl enable firewalld
sudo systemctl start firewalld
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

### 9. SELinux Configuration

```bash
sudo setsebool -P httpd_can_network_connect 1
```

### 10. SSL Certificate (Let's Encrypt)

```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

---

## Post-Installation

### Access Your Site

1. Visit `http://yourdomain.com`
2. Complete the setup wizard (create admin account)
3. Access admin panel at the secret URL you configured

### Useful Commands

```bash
# View application logs
sudo journalctl -u lms -f

# Restart application
sudo systemctl restart lms

# Check status
sudo systemctl status lms

# View Nginx logs
sudo tail -f /var/log/nginx/error.log

# Update application
cd /var/www/lms
sudo -u lmsuser git pull
sudo systemctl restart lms
```

---

## Troubleshooting

### Application won't start

```bash
# Check logs
sudo journalctl -u lms -n 50

# Check if port 8000 is in use
sudo ss -tlnp | grep 8000

# Test manually
cd /var/www/lms
sudo -u lmsuser /var/www/lms/venv/bin/python run.py
```

### 502 Bad Gateway

```bash
# Check if app is running
sudo systemctl status lms

# Check SELinux
sudo setsebool -P httpd_can_network_connect 1
```

### Database issues

```bash
# Reset database
cd /var/www/lms
sudo -u lmsuser rm data.db
sudo systemctl restart lms
```

---

## Security Checklist

- [ ] Change SECRET_KEY to a random value
- [ ] Use a unique ADMIN_SECRET_PATH
- [ ] Enable HTTPS with certbot
- [ ] Keep system updated
- [ ] Configure firewall
- [ ] Regular backups

---

## Backup & Restore

### Create Backup

```bash
cd /var/www/lms
sudo -u lmsuser tar -czf backup-$(date +%Y%m%d).tar.gz data.db uploads/
```

### Restore Backup

```bash
cd /var/www/lms
sudo systemctl stop lms
sudo -u lmsuser tar -xzf backup-YYYYMMDD.tar.gz
sudo systemctl start lms
```

---

## Support

For issues, check:
- Application logs: `journalctl -u lms -f`
- Nginx logs: `/var/log/nginx/error.log`
- System diagnostics: Visit `/api/admin/diagnostics` (admin only)
