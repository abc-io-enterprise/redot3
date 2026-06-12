#!/usr/bin/env python3
"""Create the completed-redot1-abc-io-live.zip master archive and deliverables.

This script packages the redot2 repository into three archives:
- completed-redot1-abc-io-live.zip : full master backup in the owner's Documents folder
- REDOT3.ZIP                       : redot3 React portal source deliverable
- REDOT5.ZIP                       : full ABC-IO v5.0.0 system deliverable

Secrets, build artifacts, caches, and transient files are excluded.
"""

import os
import zipfile
from datetime import datetime, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOCUMENTS = os.path.join(os.path.expanduser("~"), "Documents")
TIMESTAMP = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")

EXCLUDE_DIRS = {
    ".git",
    ".venv",
    ".git",
    "android-sdk",
    "node_modules",
    "__pycache__",
    ".temp",
    ".gradle",
    "build",
    "dist",
    ".idea",
    ".vscode",
    "postgres-data",
    "redis-data",
    "apk/android-project",
}

EXCLUDE_FILES = {
    ".env",
    ".env.local",
    ".env.production",
    "completed-redot1-abc-io-live.zip",
    "REDOT3.ZIP",
    "REDOT5.ZIP",
    "redot2-v5.0.0-final-backup.zip",
    "redot2-v5.final.zip",
    "abc-io-deploy-1b3abb1.tar.gz",
    "abc-io-deploy-43e6912.tar.gz",
    "abc-io-deploy-563a51d.tar.gz",
    "abc-io-deploy-fd49d2c.tar.gz",
}

EXCLUDE_EXTENSIONS = {
    ".key",
    ".secret",
    ".pem",
    ".p12",
    ".pfx",
    ".jks",
    ".apk",
    ".idsig",
}


def should_include(rel_path):
    parts = rel_path.split(os.sep)
    if any(part in EXCLUDE_DIRS for part in parts):
        return False
    basename = os.path.basename(rel_path)
    if basename in EXCLUDE_FILES:
        return False
    if any(basename.endswith(ext) for ext in EXCLUDE_EXTENSIONS):
        return False
    return True


def create_full_archive(output_path):
    count = 0
    with zipfile.ZipFile(output_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for dirpath, dirnames, filenames in os.walk(ROOT):
            dirnames[:] = [d for d in dirnames if d not in EXCLUDE_DIRS]
            for filename in filenames:
                full_path = os.path.join(dirpath, filename)
                rel_path = os.path.relpath(full_path, ROOT)
                if not should_include(rel_path):
                    continue
                zf.write(full_path, arcname=rel_path)
                count += 1
    return count


def create_redot3_archive(output_path):
    portal_dir = os.path.join(ROOT, "services", "redot3-portal")
    count = 0
    with zipfile.ZipFile(output_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for dirpath, dirnames, filenames in os.walk(portal_dir):
            dirnames[:] = [d for d in dirnames if d not in EXCLUDE_DIRS]
            for filename in filenames:
                full_path = os.path.join(dirpath, filename)
                rel_path = os.path.relpath(full_path, portal_dir)
                if not should_include(rel_path):
                    continue
                zf.write(full_path, arcname=rel_path)
                count += 1
    return count


def main():
    os.makedirs(DOCUMENTS, exist_ok=True)

    archives = {
        "completed-redot1-abc-io-live.zip": create_full_archive,
        "REDOT5.ZIP": create_full_archive,
        "REDOT3.ZIP": create_redot3_archive,
    }

    print(f"Creating archives from {ROOT}")
    print(f"Output directory: {DOCUMENTS}")
    print(f"Timestamp: {TIMESTAMP}")
    print()

    for name, builder in archives.items():
        output_path = os.path.join(DOCUMENTS, name)
        count = builder(output_path)
        size_mb = os.path.getsize(output_path) / (1024 * 1024)
        print(f"Created: {output_path}")
        print(f"  Files: {count}")
        print(f"  Size: {size_mb:.2f} MB")
        print()


if __name__ == "__main__":
    main()
