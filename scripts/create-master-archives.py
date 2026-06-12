#!/usr/bin/env python3
"""
Create master release archives for ABC-IO v2.0 / redot3.

Outputs:
  - REDOT3.ZIP: GitHub-ready redot3 repository package.
  - REDOT5.ZIP: private Google Cloud migration package.
  - completed-redot1-abc-io-live.zip: full working backup package.

Excludes secrets, node_modules, caches, Docker volumes, transient files, and large binaries.
"""

import json
import os
import zipfile
from datetime import datetime, timezone
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
DOC_DIR = Path.home() / "Documents"
DOC_DIR.mkdir(parents=True, exist_ok=True)

EXCLUDED_DIRS = {
    ".git",
    ".venv",
    "venv",
    "node_modules",
    "__pycache__",
    ".pytest_cache",
    ".next",
    "dist",
    "build",
    ".turbo",
    ".cache",
    "target",
    "vendor",
    "postgres-data",
    "headscale-data",
    "redis-data",
    "grafana-data",
    "prometheus-data",
    "android-sdk",
    "apk/android-project/build",
    "repositories",
}

EXCLUDED_FILES = {
    ".env",
    ".env.local",
    ".env.production",
    ".env.staging",
    ".key",
    ".secret",
    ".pem",
    ".p12",
    ".pfx",
    ".keystore",
    ".jks",
    "redot2-latest.apk",
    "redot2-operator.apk",
    "redot2-operator.apk.idsig",
    "COMPLETE_LAUNCH_REQUEST.md",
    "cmdline-tools.zip",
    ".DS_Store",
    "Thumbs.db",
}

EXCLUDED_EXTS = {".pyc", ".pyo", ".sock", ".pid", ".lock", ".swp", ".swo", ".log", ".tmp", ".zip", ".apk", ".jks", ".idsig"}


def should_include(path: Path, root: Path) -> bool:
    rel = path.relative_to(root)
    for part in rel.parts:
        if part in EXCLUDED_DIRS:
            return False
    if path.name in EXCLUDED_FILES:
        return False
    if any(path.name.endswith(ext) for ext in EXCLUDED_EXTS):
        return False
    if ".git" in rel.parts:
        return False
    return True


def add_directory(zipf: zipfile.ZipFile, source_dir: Path, archive_prefix: str = ""):
    for path in sorted(source_dir.rglob("*")):
        if not should_include(path, source_dir):
            continue
        if path.is_file():
            arcname = archive_prefix + str(path.relative_to(source_dir)).replace("\\", "/")
            zipf.write(path, arcname)


def create_archive(name: str, archive_prefix: str, description: str):
    output = DOC_DIR / name
    print(f"Creating {output} from {REPO_ROOT} ...")
    with zipfile.ZipFile(output, "w", zipfile.ZIP_DEFLATED) as zipf:
        add_directory(zipf, REPO_ROOT, archive_prefix=archive_prefix)
    size = output.stat().st_size
    files = count_files(output)
    print(f"  -> {size:,} bytes ({size / 1024 / 1024:.2f} MB), {files} files")
    return {
        "path": str(output),
        "size_bytes": size,
        "size_mb": round(size / 1024 / 1024, 2),
        "files": files,
        "description": description,
    }


def count_files(zip_path: Path) -> int:
    with zipfile.ZipFile(zip_path, "r") as zipf:
        return len(zipf.namelist())


def main():
    print("ABC-IO Master Archive Builder")
    print(f"Repo root: {REPO_ROOT}")
    print(f"Output dir: {DOC_DIR}")
    print()

    archives = {
        "REDOT3.ZIP": create_archive(
            "REDOT3.ZIP",
            "redot3/",
            "GitHub-ready redot3 repository package for public and private deployment preparation",
        ),
        "REDOT5.ZIP": create_archive(
            "REDOT5.ZIP",
            "redot5/",
            "Private Google Cloud redot5 migration package with Terraform, Kubernetes, docs, manifests, and legal files",
        ),
        "completed-redot1-abc-io-live.zip": create_archive(
            "completed-redot1-abc-io-live.zip",
            "redot1-abc-io-live/",
            "Master working backup of the live system",
        ),
    }

    manifest = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "repo_root": str(REPO_ROOT),
        "status": "SYSTEM: READY FOR OWNER REVIEW",
        "archives": archives,
    }

    manifest_path = REPO_ROOT / "master_archive_manifest.json"
    with open(manifest_path, "w", encoding="utf-8", newline="\n") as f:
        f.write(json.dumps(manifest, indent=2) + "\n")
    print(f"\nManifest written: {manifest_path}")
    print(json.dumps(manifest, indent=2))


if __name__ == "__main__":
    main()
