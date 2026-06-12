#!/usr/bin/env python3
"""Verify that .env and other secrets are safely stored and not exposed."""
import logging
import os
import subprocess
import sys
from pathlib import Path

logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] %(levelname)s: %(message)s",
)
log = logging.getLogger(__name__)

REPO_ROOT = Path(__file__).resolve().parent.parent


def run(cmd: list[str], **kwargs) -> subprocess.CompletedProcess:
    return subprocess.run(
        cmd,
        cwd=REPO_ROOT,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        **kwargs,
    )


def check_gitignored(path: str) -> bool:
    """Return True if path is ignored by git (or not tracked)."""
    result = run(["git", "check-ignore", "-q", path])
    return result.returncode == 0


def check_tracked(path: str) -> bool:
    """Return True if path is tracked by git."""
    result = run(["git", "ls-files", "--error-unmatch", path])
    return result.returncode == 0


def check_efs_encrypted(path: Path) -> bool:
    """Return True if the file is EFS-encrypted (Windows)."""
    if sys.platform != "win32":
        # On non-Windows, fall back to checking ownership/permissions.
        try:
            mode = path.stat().st_mode
            return bool(mode & 0o077) is False
        except OSError:
            return False
    result = run(["powershell", "-Command", f"(Get-Item '{path}').Attributes -band [System.IO.FileAttributes]::Encrypted"])
    return result.returncode == 0 and result.stdout.strip().lower() == "encrypted"


def main() -> int:
    env_file = REPO_ROOT / ".env"
    example_file = REPO_ROOT / ".env.example"
    errors = []
    warnings = []

    log.info("Starting env-safety verification...")

    if not env_file.exists():
        log.error(".env file not found at %s", env_file)
        errors.append(".env missing")
    else:
        log.info(".env exists")

    if check_tracked(".env"):
        log.error(".env is tracked by git — this must never happen!")
        errors.append(".env tracked")
    else:
        log.info(".env is not tracked by git")

    if check_gitignored(".env"):
        log.info(".env is covered by .gitignore")
    else:
        log.warning(".env is not covered by .gitignore")
        warnings.append(".env not gitignored")

    if env_file.exists() and check_efs_encrypted(env_file):
        log.info(".env is EFS-encrypted")
    elif env_file.exists():
        log.warning(".env is NOT EFS-encrypted (run: cipher /e .env)")
        warnings.append(".env not encrypted")

    if example_file.exists():
        log.info(".env.example template exists")
    else:
        log.warning(".env.example template missing")
        warnings.append(".env.example missing")

    # Ensure no gitea ssh host keys are tracked
    gitea_key = REPO_ROOT / "config" / "gitea" / "ssh-host-key"
    if gitea_key.exists() or check_tracked("config/gitea/ssh-host-key"):
        log.error("Gitea SSH host key is present or tracked — regenerate on first run instead")
        errors.append("gitea host key exposed")
    else:
        log.info("Gitea SSH host key is not tracked")

    if errors:
        log.error("Verification FAILED with %d error(s)", len(errors))
        return 1

    if warnings:
        log.warning("Verification PASSED with %d warning(s)", len(warnings))
        return 0

    log.info("Verification PASSED — .env is safely stored")
    return 0


if __name__ == "__main__":
    sys.exit(main())
