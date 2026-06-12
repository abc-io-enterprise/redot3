#!/usr/bin/env python3
"""
Create master release archives for ABC-IO v2.0 / redot3.

Outputs:
  - REDOT3.ZIP          : redot3-portal React source only
  - REDOT5.ZIP          : full private system archive for future cloud migration
  - completed-redot1-abc-io-live.zip : master working backup

Excludes secrets, node_modules, caches, Docker volumes, transient files, and large binaries.
"""

import os
import sys
import json
import zipfile
from pathlib import Path
from datetime import datetime, timezone

REPO_ROOT = Path(__file__).resolve().parent.parent
DOC_DIR = Path.home() / 'Documents'
DOC_DIR.mkdir(parents=True, exist_ok=True)

EXCLUDED_DIRS = {
    '.git', '.venv', 'node_modules', '__pycache__', '.pytest_cache',
    '.next', 'dist', 'build', '.turbo', '.cache', 'target', 'vendor',
    'postgres-data', 'headscale-data', 'redis-data', 'grafana-data',
    'prometheus-data', '.security', '.github', '.vscode', '.devcontainer',
    'repositories', 'android-sdk'
}

EXCLUDED_FILES = {
    '.env', '.env.local', '.env.production', '.env.staging',
    '.key', '.secret', '.pem', '.p12', '.pfx', '.keystore', '.jks',
    'redot2-latest.apk', 'redot2-operator.apk', 'redot2-operator.apk.idsig',
    'cmdline-tools.zip', '.DS_Store', 'Thumbs.db', '*.log', '*.tmp'
}

EXCLUDED_EXTS = {'.pyc', '.pyo', '.sock', '.pid', '.lock', '.swp', '.swo'}


def should_include(path: Path, root: Path) -> bool:
    rel = path.relative_to(root)
    for part in rel.parts:
        if part in EXCLUDED_DIRS:
            return False
    if path.name in EXCLUDED_FILES:
        return False
    if any(path.name.endswith(ext) for ext in EXCLUDED_EXTS):
        return False
    # Skip files inside .git filter-repo
    if '.git' in rel.parts:
        return False
    return True


def add_directory(zipf: zipfile.ZipFile, source_dir: Path, archive_prefix: str = ''):
    for path in sorted(source_dir.rglob('*')):
        if not should_include(path, source_dir):
            continue
        if path.is_file():
            arcname = archive_prefix + str(path.relative_to(source_dir)).replace('\\', '/')
            zipf.write(path, arcname)


def create_redot3_archive():
    output = DOC_DIR / 'REDOT3.ZIP'
    source = REPO_ROOT / 'services' / 'redot3-portal'
    print(f'Creating {output} from {source} ...')
    with zipfile.ZipFile(output, 'w', zipfile.ZIP_DEFLATED) as zipf:
        add_directory(zipf, source, archive_prefix='redot3-portal/')
    size = output.stat().st_size
    print(f'  -> {size:,} bytes ({size / 1024 / 1024:.2f} MB)')
    return output, size


def create_full_archive(name: str, archive_prefix: str = 'redot2/'):
    output = DOC_DIR / name
    print(f'Creating {output} from {REPO_ROOT} ...')
    with zipfile.ZipFile(output, 'w', zipfile.ZIP_DEFLATED) as zipf:
        add_directory(zipf, REPO_ROOT, archive_prefix=archive_prefix)
    size = output.stat().st_size
    print(f'  -> {size:,} bytes ({size / 1024 / 1024:.2f} MB)')
    return output, size


def count_files(zip_path: Path) -> int:
    with zipfile.ZipFile(zip_path, 'r') as zipf:
        return len(zipf.namelist())


def main():
    print('ABC-IO Master Archive Builder')
    print(f'Repo root: {REPO_ROOT}')
    print(f'Output dir: {DOC_DIR}')
    print()

    redot3_path, redot3_size = create_redot3_archive()
    redot5_path, redot5_size = create_full_archive('REDOT5.ZIP', archive_prefix='redot5/')
    live_path, live_size = create_full_archive('completed-redot1-abc-io-live.zip', archive_prefix='redot1-abc-io-live/')

    manifest = {
        'generated_at': datetime.now(timezone.utc).isoformat(),
        'repo_root': str(REPO_ROOT),
        'archives': {
            'REDOT3.ZIP': {
                'path': str(redot3_path),
                'size_bytes': redot3_size,
                'size_mb': round(redot3_size / 1024 / 1024, 2),
                'files': count_files(redot3_path),
                'description': 'React 19 redot3-portal source only'
            },
            'REDOT5.ZIP': {
                'path': str(redot5_path),
                'size_bytes': redot5_size,
                'size_mb': round(redot5_size / 1024 / 1024, 2),
                'files': count_files(redot5_path),
                'description': 'Full private system archive for future cloud migration'
            },
            'completed-redot1-abc-io-live.zip': {
                'path': str(live_path),
                'size_bytes': live_size,
                'size_mb': round(live_size / 1024 / 1024, 2),
                'files': count_files(live_path),
                'description': 'Master working backup of live system'
            }
        }
    }

    manifest_path = REPO_ROOT / 'master_archive_manifest.json'
    with open(manifest_path, 'w', encoding='utf-8') as f:
        json.dump(manifest, f, indent=2)
    print(f'\nManifest written: {manifest_path}')
    print(json.dumps(manifest, indent=2))


if __name__ == '__main__':
    main()
