# LMS Website Builder - Deployment Guide

## Quick Install on Ubuntu Server

### Option 1: Automatic Installation (Recommended)

1. **Transfer files to your server:**
   ```bash
   # From your Windows PC, create a zip file and transfer it
   # Or use SCP/SFTP to copy the lms-website-builder folder
   scp -r lms-website-builder user@your-server:/tmp/
   ```

2. **Run the installer on the server:**
   ```bash
   cd /tmp/lms-website-builder/deployment
   chmod +x install_ubuntu.sh
   sudo ./install_ubuntu.sh
   ```

3. **Access your LMS:**
   - Local: http://localhost:8001
   - Network: http://YOUR_SERVER_IP:8001

---

### Option 2: Manual Installation

1. **Install dependencies:**
   ```bash
   sudo apt update && sudo apt upgrade -y
   sudo apt install -y python3 python3-pip python3-venv git sqlite3
   ```

2. **Create application directory:**
   ```bash
   sudo mkdir -p /opt/lms-website
   sudo chown $USER:$USER /opt/lms-website
   ```

3. **Copy files to server:**
   ```bash
   # Copy your lms-website-builder files to /opt/lms-website
   cp -r /path/to/lms-website-builder/* /opt/lms-website/
   ```

4. **Create virtual environment and install dependencies:**
   ```bash
   cd /opt/lms-website
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

5. **Create service user:**
   ```bash
   sudo useradd -r -s /bin/false -d /opt/lms-website lms
   sudo chown -R lms:lms /opt/lms-website
   ```

6. **Install systemd service:**
   ```bash
   sudo cp deployment/lms-website.service /etc/systemd/system/
   sudo systemctl daemon-reload
   sudo systemctl enable lms-website
   sudo systemctl start lms-website
   ```

---

## Service Management

```bash
# Check status
sudo systemctl status lms-website

# Start service
sudo systemctl start lms-website

# Stop service
sudo systemctl stop lms-website

# Restart service
sudo systemctl restart lms-website

# View logs
sudo journalctl -u lms-website -f

# View last 100 lines of logs
sudo journalctl -u lms-website -n 100
```

---

## Firewall Configuration

```bash
# Allow LMS port
sudo ufw allow 8001/tcp

# If using nginx as reverse proxy, allow HTTP/HTTPS instead
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

---

## Nginx Reverse Proxy (Optional)

If you want to use a domain name and SSL:

1. **Install Nginx:**
   ```bash
   sudo apt install nginx
   ```

2. **Create Nginx config:**
   ```bash
   sudo nano /etc/nginx/sites-available/lms
   ```

3. **Add configuration:**
   ```nginx
   server {
       listen 80;
       server_name lms.yourdomain.com;

       location / {
           proxy_pass http://127.0.0.1:8001;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }

       # Handle uploads
       client_max_body_size 50M;
   }
   ```

4. **Enable site:**
   ```bash
   sudo ln -s /etc/nginx/sites-available/lms /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

5. **Add SSL with Let's Encrypt:**
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d lms.yourdomain.com
   ```

---

## Running on Same Server as CRM

If you have the CRM already running on port 8000, the LMS will run on port 8001 by default.

To access both:
- CRM: http://YOUR_SERVER_IP:8000
- LMS: http://YOUR_SERVER_IP:8001

---

## Backup & Restore

### Backup
```bash
# Backup database and uploads
cd /opt/lms-website
sudo tar -czvf lms-backup-$(date +%Y%m%d).tar.gz data.db uploads/
```

### Restore
```bash
# Stop service first
sudo systemctl stop lms-website

# Restore backup
cd /opt/lms-website
sudo tar -xzvf lms-backup-YYYYMMDD.tar.gz

# Fix permissions and restart
sudo chown -R lms:lms /opt/lms-website
sudo systemctl start lms-website
```

---

## Troubleshooting

### Service won't start
```bash
# Check detailed error logs
sudo journalctl -u lms-website -n 50 --no-pager

# Test manually
cd /opt/lms-website
sudo -u lms ./venv/bin/python -m uvicorn app.main:app --host 0.0.0.0 --port 8001
```

### Permission errors
```bash
sudo chown -R lms:lms /opt/lms-website
sudo chmod -R 755 /opt/lms-website
sudo chmod 664 /opt/lms-website/data.db
```

### Port already in use
```bash
# Find what's using the port
sudo lsof -i :8001

# Change port in service file
sudo nano /etc/systemd/system/lms-website.service
# Change --port 8001 to another port
sudo systemctl daemon-reload
sudo systemctl restart lms-website
```
