#!/bin/bash
# ============================================================
# SSH Deploy Key Setup for Private GitHub Repository
# Run this script on your VPS: bash scripts/setup_ssh_key.sh
# ============================================================

echo "============================================================"
echo "  SSH Deploy Key Setup for GitHub"
echo "============================================================"
echo ""

# Configuration
SSH_DIR="/opt/lms-website/.ssh"
KEY_FILE="$SSH_DIR/github_deploy_key"

# Create .ssh directory if it doesn't exist
echo "1. Creating SSH directory..."
mkdir -p "$SSH_DIR"
chmod 700 "$SSH_DIR"

# Generate SSH key if it doesn't exist
if [ -f "$KEY_FILE" ]; then
    echo "   SSH key already exists at $KEY_FILE"
else
    echo "2. Generating new SSH key..."
    ssh-keygen -t ed25519 -f "$KEY_FILE" -N "" -C "lms-website-deploy-key"
    echo "   ✓ SSH key generated"
fi

# Set proper permissions
chmod 600 "$KEY_FILE"
chmod 644 "$KEY_FILE.pub"

# Create SSH config for GitHub
echo ""
echo "3. Configuring SSH for GitHub..."
SSH_CONFIG="$SSH_DIR/config"
cat > "$SSH_CONFIG" << EOF
Host github.com
    HostName github.com
    User git
    IdentityFile $KEY_FILE
    IdentitiesOnly yes
    StrictHostKeyChecking no
EOF
chmod 600 "$SSH_CONFIG"
echo "   ✓ SSH config created"

# Display the public key
echo ""
echo "============================================================"
echo "  YOUR DEPLOY KEY (copy this entire block):"
echo "============================================================"
echo ""
cat "$KEY_FILE.pub"
echo ""
echo "============================================================"
echo ""
echo "NEXT STEPS:"
echo ""
echo "1. Copy the key above"
echo ""
echo "2. Go to your GitHub repo:"
echo "   https://github.com/dadad132/LMS/settings/keys"
echo ""
echo "3. Click 'Add deploy key'"
echo "   - Title: LMS VPS Deploy Key"
echo "   - Key: Paste the key above"
echo "   - ✓ Allow write access (optional, for pushing)"
echo "   - Click 'Add key'"
echo ""
echo "4. Update your git remote to use SSH:"
echo "   cd /opt/lms-website"
echo "   git remote set-url origin git@github.com:dadad132/LMS.git"
echo ""
echo "5. Test the connection:"
echo "   GIT_SSH_COMMAND='ssh -i $KEY_FILE -o StrictHostKeyChecking=no' git fetch origin"
echo ""
echo "============================================================"
