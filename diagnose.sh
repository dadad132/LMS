#!/bin/bash
# Honeypot Global - Detailed Server Diagnostic & Auto-Repair Tool
# Run: sudo bash diagnose.sh
# Saves full report to: /var/log/lms-diagnostic.log

LOG_FILE="/var/log/lms-diagnostic.log"

{
    echo "================================================================"
    echo "🔍 HONEYPOT GLOBAL - SERVER DIAGNOSTIC & AUTO-REPAIR REPORT"
    echo "Timestamp: $(date)"
    echo "================================================================"
    echo ""

    echo "--- [1] CHECKING & FIXING LEGACY SYSTEMD SERVICES (lms.service / lms-api.service) ---"
    for UNIT_FILE in /etc/systemd/system/lms.service /etc/systemd/system/lms-website.service /etc/systemd/system/lms-api.service; do
        if [ -e "$UNIT_FILE" ] || [ -L "$UNIT_FILE" ]; then
            echo "Found unit file: $UNIT_FILE"
            ls -la "$UNIT_FILE" 2>&1
            cat "$UNIT_FILE" 2>&1
            echo "----------------------------------------------------------------"
        fi
    done

    # If lms.service is still the old broken unit with WorkingDirectory (not a symlink to lms-api.service), fix it immediately
    if [ -f "/etc/systemd/system/lms.service" ] && [ ! -L "/etc/systemd/system/lms.service" ]; then
        if grep -q "WorkingDirectory" /etc/systemd/system/lms.service 2>/dev/null; then
            echo "⚠️ Detected legacy broken /etc/systemd/system/lms.service with WorkingDirectory! Replacing with symlink to lms-api.service..."
            systemctl stop lms 2>/dev/null || true
            systemctl disable lms 2>/dev/null || true
            rm -rf /etc/systemd/system/lms.service /etc/systemd/system/lms.service.d
            if [ -f "/etc/systemd/system/lms-api.service" ]; then
                ln -sf /etc/systemd/system/lms-api.service /etc/systemd/system/lms.service
            fi
            systemctl daemon-reload
            systemctl reset-failed lms lms-api 2>/dev/null || true
            systemctl restart lms-api 2>/dev/null || true
            echo "✅ Legacy lms.service replaced and linked to lms-api.service."
        fi
    fi

    echo ""
    echo "Current systemctl status lms-api:"
    systemctl status lms-api --no-pager -l 2>&1 || true
    echo ""

    echo "--- [2] INSPECTING ALL BACKUP ARCHIVES IN /var/backups/lms ---"
    rm -rf /tmp/lms_bkp_check_* /tmp/lms_clone_* /tmp/lms_reinstall_* /tmp/lms_diag_* 2>/dev/null || true
    if [ -d "/var/backups/lms" ]; then
        ls -lhS /var/backups/lms/*.tar.gz 2>/dev/null || echo "No .tar.gz files in /var/backups/lms"
        echo ""
        STAGE_DIR="/var/lib/lms/.diag_stage"
        for BKP in $(ls -1S /var/backups/lms/*.tar.gz 2>/dev/null | head -n 5); do
            echo "📦 Archive: $(basename "$BKP") ($(du -h "$BKP" | awk '{print $1}'))"
            rm -rf "$STAGE_DIR"
            mkdir -p "$STAGE_DIR"
            tar -xzf "$BKP" -C "$STAGE_DIR" --exclude="*uploads*" 2>/dev/null || true
            for DBF in users.json materials.json subjects.json modules.json team.json testimonials.json; do
                FOUND=$(find "$STAGE_DIR" -name "$DBF" -type f 2>/dev/null | head -n 1)
                if [ -n "$FOUND" ]; then
                    SZ=$(wc -c < "$FOUND" 2>/dev/null || echo 0)
                    echo "   - $DBF: $SZ bytes"
                    # Auto-restore if larger than current /var/lib/lms/$DBF
                    CUR_SZ=0
                    [ -f "/var/lib/lms/$DBF" ] && CUR_SZ=$(wc -c < "/var/lib/lms/$DBF" 2>/dev/null || echo 0)
                    if [ "$SZ" -gt "$CUR_SZ" ]; then
                        mkdir -p /var/lib/lms
                        cp -f "$FOUND" "/var/lib/lms/$DBF"
                        echo "     ✅ AUTO-RESTORED $DBF ($SZ bytes -> /var/lib/lms/$DBF)"
                    fi
                fi
            done
            rm -rf "$STAGE_DIR"
        done
        LARGEST_BKP=$(ls -1S /var/backups/lms/*.tar.gz 2>/dev/null | head -n 1)
        if [ -n "$LARGEST_BKP" ]; then
            tar -xzf "$LARGEST_BKP" --skip-old-files -C /var/lib/lms ./uploads 2>/dev/null || \
            tar -xzf "$LARGEST_BKP" --skip-old-files -C /var/lib/lms uploads 2>/dev/null || true
        fi
    else
        echo "Directory /var/backups/lms does not exist!"
    fi

    echo ""
    echo "--- [3] CURRENT ACTIVE DATABASE FILES IN /var/lib/lms ---"
    ls -lh /var/lib/lms 2>&1 || true
    python3 - << 'PYEOF'
import os, json
data_dir = "/var/lib/lms"
for fname in ["users.json", "materials.json", "subjects.json", "modules.json", "team.json", "testimonials.json"]:
    fpath = os.path.join(data_dir, fname)
    if os.path.exists(fpath):
        try:
            with open(fpath, "r", encoding="utf-8") as f:
                data = json.load(f)
            count = len(data) if isinstance(data, (list, dict)) else 1
            print(f"   - {fname}: {os.path.getsize(fpath)} bytes ({count} records)")
        except Exception as e:
            print(f"   - {fname}: ERROR reading JSON ({e})")
    else:
        print(f"   - {fname}: MISSING")
uploads_dir = os.path.join(data_dir, "uploads")
if os.path.isdir(uploads_dir):
    print(f"   - uploads/: {len(os.listdir(uploads_dir))} files")
PYEOF

    echo ""
    echo "--- [4] LOCAL API & NGINX CONNECTIVITY TEST ---"
    echo "Testing http://127.0.0.1:8001/api/auth-status :"
    curl -i -s http://127.0.0.1:8001/api/auth-status | head -n 25 2>&1 || true
    echo ""
    echo "Nginx status & config test:"
    nginx -t 2>&1 || true
    systemctl is-active nginx 2>&1 || true

    echo ""
    echo "--- [5] RECENT API LOGS (/var/log/lms-api.log & journalctl) ---"
    if [ -f "/var/log/lms-api.log" ]; then
        tail -n 25 /var/log/lms-api.log 2>&1
    fi
    journalctl -u lms-api -n 25 --no-pager 2>&1 || true

    echo ""
    echo "--- [6] RECENT NGINX ERROR LOGS (/var/log/nginx/error.log) ---"
    if [ -f "/var/log/nginx/error.log" ]; then
        tail -n 20 /var/log/nginx/error.log 2>&1
    else
        echo "No /var/log/nginx/error.log found."
    fi

    echo ""
    echo "================================================================"
    echo "✅ Full diagnostic report saved to: $LOG_FILE"
    echo "================================================================"
} | tee "$LOG_FILE"
