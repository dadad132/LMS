"""
LMS Update Manager - handles updates from GitHub (supports private repos via SSH)
"""
import os
import subprocess
import logging
from pathlib import Path
from typing import Optional, List, Dict

logger = logging.getLogger("LMS")

class UpdateManager:
    """Manages system updates via git with SSH support for private repositories"""
    
    def __init__(self, repo_owner: str = "dadad132", repo_name: str = "LMS"):
        self.repo_owner = repo_owner
        self.repo_name = repo_name
        self.app_dir = Path(__file__).parent.parent.parent  # /opt/lms-website
        self.ssh_key_path = self._find_ssh_key()
        
    def _find_ssh_key(self) -> Optional[Path]:
        """Find SSH key for GitHub authentication"""
        possible_paths = [
            self.app_dir / ".ssh" / "deploy_key",  # LMS app directory
            Path.home() / ".ssh" / "lms_deploy_key",
            Path.home() / ".ssh" / "github_deploy_key",
            Path.home() / ".ssh" / "deploy_key",
            Path.home() / ".ssh" / "id_ed25519",
            Path.home() / ".ssh" / "id_rsa",
            Path("/opt/lms-website/.ssh/deploy_key"),  # Fallback absolute path
        ]
        
        for key_path in possible_paths:
            if key_path.exists():
                logger.info(f"Found SSH key at: {key_path}")
                return key_path
        
        return None
    
    def _get_git_env(self) -> Dict[str, str]:
        """Get environment variables for git commands with SSH key"""
        env = os.environ.copy()
        
        if self.ssh_key_path and self.ssh_key_path.exists():
            ssh_command = f'ssh -i {self.ssh_key_path} -o StrictHostKeyChecking=accept-new -o IdentitiesOnly=yes'
            env['GIT_SSH_COMMAND'] = ssh_command
            logger.info(f"Using SSH key: {self.ssh_key_path}")
        
        return env
    
    def _run_git_command(self, args: List[str], **kwargs) -> subprocess.CompletedProcess:
        """Run a git command with proper SSH environment"""
        env = self._get_git_env()
        return subprocess.run(
            args,
            cwd=kwargs.get('cwd', self.app_dir),
            capture_output=kwargs.get('capture_output', True),
            text=kwargs.get('text', True),
            check=kwargs.get('check', False),
            env=env,
            timeout=kwargs.get('timeout', 120)
        )
    
    def get_current_version(self) -> Dict[str, str]:
        """Get current git commit info"""
        try:
            result = subprocess.run(
                ["git", "rev-parse", "--short", "HEAD"],
                cwd=self.app_dir,
                capture_output=True,
                text=True,
                check=True
            )
            commit_hash = result.stdout.strip()
            
            result = subprocess.run(
                ["git", "log", "-1", "--pretty=%B"],
                cwd=self.app_dir,
                capture_output=True,
                text=True,
                check=True
            )
            commit_message = result.stdout.strip().split('\n')[0]
            
            result = subprocess.run(
                ["git", "log", "-1", "--pretty=%ci"],
                cwd=self.app_dir,
                capture_output=True,
                text=True,
                check=True
            )
            commit_date = result.stdout.strip()
            
            return {
                "hash": commit_hash,
                "message": commit_message,
                "date": commit_date
            }
        except Exception as e:
            logger.error(f"Failed to get current version: {e}")
            return {
                "hash": "unknown",
                "message": "Unable to determine version",
                "date": "unknown"
            }
    
    def check_for_updates(self) -> Dict[str, any]:
        """Check if updates are available"""
        try:
            # Fetch from remote
            result = self._run_git_command(["git", "fetch", "origin"])
            
            if result.returncode != 0:
                return {"success": False, "error": "Failed to fetch from GitHub"}
            
            # Check how many commits behind
            result = subprocess.run(
                ["git", "rev-list", "HEAD..origin/main", "--count"],
                cwd=self.app_dir,
                capture_output=True,
                text=True,
                check=False
            )
            
            commits_behind = int(result.stdout.strip()) if result.stdout.strip().isdigit() else 0
            
            # Get list of changes
            changes = []
            if commits_behind > 0:
                result = subprocess.run(
                    ["git", "log", "HEAD..origin/main", "--oneline"],
                    cwd=self.app_dir,
                    capture_output=True,
                    text=True,
                    check=False
                )
                changes = result.stdout.strip().split('\n') if result.stdout.strip() else []
            
            return {
                "success": True,
                "updates_available": commits_behind > 0,
                "commits_behind": commits_behind,
                "changes": changes
            }
        except Exception as e:
            logger.error(f"Failed to check for updates: {e}")
            return {"success": False, "error": str(e)}
    
    def update_to_latest(self) -> Dict[str, any]:
        """Update to latest version from GitHub"""
        try:
            # Fetch first
            logger.info("Fetching updates from GitHub...")
            result = self._run_git_command(["git", "fetch", "origin"])
            
            if result.returncode != 0:
                return {"success": False, "error": f"Fetch failed: {result.stderr}"}
            
            # Check if already up to date
            result = subprocess.run(
                ["git", "log", "HEAD..origin/main", "--oneline"],
                cwd=self.app_dir,
                capture_output=True,
                text=True,
                check=False
            )
            
            if not result.stdout.strip():
                return {"success": True, "message": "Already up to date", "changes": []}
            
            changes = result.stdout.strip().split('\n')
            
            # Reset to latest
            logger.info("Applying updates...")
            result = self._run_git_command(["git", "reset", "--hard", "origin/main"])
            
            if result.returncode != 0:
                return {"success": False, "error": f"Update failed: {result.stderr}"}
            
            # Update dependencies
            venv_pip = self.app_dir / "venv" / "bin" / "pip"
            if venv_pip.exists():
                logger.info("Updating dependencies...")
                subprocess.run(
                    [str(venv_pip), "install", "-r", "requirements.txt", "--upgrade", "-q"],
                    cwd=self.app_dir,
                    capture_output=True,
                    text=True
                )
            
            return {
                "success": True,
                "message": f"Updated successfully! {len(changes)} commits applied.",
                "changes": changes,
                "requires_restart": True
            }
        except Exception as e:
            logger.error(f"Update failed: {e}")
            return {"success": False, "error": str(e)}
    
    def get_ssh_status(self) -> Dict[str, any]:
        """Check SSH key status"""
        if self.ssh_key_path and self.ssh_key_path.exists():
            return {
                "configured": True,
                "key_path": str(self.ssh_key_path),
                "message": "SSH key found and will be used for updates"
            }
        else:
            return {
                "configured": False,
                "message": "No SSH key found. Updates may fail for private repos."
            }


# Global instance
update_manager = UpdateManager()
