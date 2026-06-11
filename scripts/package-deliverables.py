#!/usr/bin/env python3
"""Package redot2 v5.0.0 deliverable ZIP archives."""
import os
import zipfile
from datetime import datetime, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EXCLUDES = {
    ".git", ".venv", "node_modules", "__pycache__", "repositories",
    "android-sdk", "apk", ".security", ".vscode", ".devcontainer",
}
SKIP_EXTENSIONS = {".tar.gz", ".zip", ".apk", ".jks", ".idsig"}


def should_include(rel_path):
    parts = rel_path.split(os.sep)
    for part in parts:
        if part in EXCLUDES or part.startswith(".") and part in {".git", ".venv", ".security"}:
            return False
    lower = rel_path.lower()
    for ext in SKIP_EXTENSIONS:
        if lower.endswith(ext):
            return False
    return True


def make_zip(output_path, source_dir, predicate):
    count = 0
    with zipfile.ZipFile(output_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for dirpath, dirnames, filenames in os.walk(source_dir):
            dirnames[:] = [d for d in dirnames if d not in EXCLUDES and not d.startswith(".")]
            for fname in filenames:
                full = os.path.join(dirpath, fname)
                rel = os.path.relpath(full, source_dir)
                if not predicate(rel):
                    continue
                zf.write(full, rel)
                count += 1
    return count


def main():
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    print(f"Packaging deliverables at {now}")

    slim = os.path.join(os.path.dirname(ROOT), "redot2-v5.final.zip")
    full = os.path.join(ROOT, "redot2-v5.0.0-final-backup.zip")

    # Slim archive outside the repo
    n = make_zip(slim, ROOT, should_include)
    print(f"Slim archive: {slim} ({n} files)")

    # Full backup archive inside the repo
    n = make_zip(full, ROOT, should_include)
    print(f"Full backup archive: {full} ({n} files)")

    # Also copy slim into repo for easy access
    repo_slim = os.path.join(ROOT, "redot2-v5.final.zip")
    import shutil
    shutil.copy2(slim, repo_slim)
    print(f"Copied slim archive to: {repo_slim}")


if __name__ == "__main__":
    main()
