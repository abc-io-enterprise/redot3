#!/usr/bin/env python3
"""Create the final v5.0.0 project backup ZIP."""

import os
import zipfile
from datetime import datetime, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUTPUT = os.path.join(ROOT, "redot2-v5.0.0-final-backup.zip")

EXCLUDE_DIRS = {
    ".git",
    ".venv",
    "android-sdk",
    "node_modules",
    "__pycache__",
    ".temp",
    ".gradle",
    "build",
    "dist",
}

EXCLUDE_FILES = {
    ".env",
    "redot2-v5.0.0-final-backup.zip",
    "abc-io-deploy-1b3abb1.tar.gz",
    "abc-io-deploy-43e6912.tar.gz",
    "abc-io-deploy-563a51d.tar.gz",
    "abc-io-deploy-fd49d2c.tar.gz",
}


def should_include(rel_path):
    parts = rel_path.split(os.sep)
    if any(part in EXCLUDE_DIRS for part in parts):
        return False
    if os.path.basename(rel_path) in EXCLUDE_FILES:
        return False
    return True


def main():
    count = 0
    with zipfile.ZipFile(OUTPUT, "w", zipfile.ZIP_DEFLATED) as zf:
        for dirpath, dirnames, filenames in os.walk(ROOT):
            # Prune excluded dirs in-place
            dirnames[:] = [d for d in dirnames if d not in EXCLUDE_DIRS]
            for filename in filenames:
                full_path = os.path.join(dirpath, filename)
                rel_path = os.path.relpath(full_path, ROOT)
                if not should_include(rel_path):
                    continue
                zf.write(full_path, arcname=rel_path)
                count += 1

    size_mb = os.path.getsize(OUTPUT) / (1024 * 1024)
    print(f"Created: {OUTPUT}")
    print(f"Files: {count}")
    print(f"Size: {size_mb:.2f} MB")


if __name__ == "__main__":
    main()
