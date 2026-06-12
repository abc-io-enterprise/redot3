#!/usr/bin/env python3
"""Deploy ABC-IO v5.0.0 across redot1 + ai1 + ai2 as a redundant triple-node cluster."""
import os
import sys
import time
import tarfile
import tempfile
import io
from pathlib import Path

import paramiko

ROOT = Path(__file__).resolve().parent.parent

# Load .env into environment for this script
ENV_PATH = ROOT / ".env"
if ENV_PATH.exists():
    with ENV_PATH.open("r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            if key not in os.environ:
                os.environ[key] = value

REDOT1_PASSWORD = os.getenv("VPS_REDOT1_PASSWORD", "")
AI1_PASSWORD = os.getenv("VPS_AI1_PASSWORD", "")
AI2_PASSWORD = os.getenv("VPS_AI2_PASSWORD", "")
BUNDLE_NAME = "abc-io-cluster-deploy.tar.gz"

REDOT1 = os.getenv("REDOT1_IP", "162.254.32.142")
AI1 = os.getenv("AI1_IP", "192.227.212.235")
AI2 = os.getenv("AI2_IP", "192.227.212.237")
USER = "root"
REMOTE_DIR = "/opt/redot2"

NODES = {
    "redot1": {"ip": REDOT1, "password": REDOT1_PASSWORD, "compose": "compose.prod.yml"},
    "ai1": {"ip": AI1, "password": AI1_PASSWORD, "compose": "compose.replica.yml"},
    "ai2": {"ip": AI2, "password": AI2_PASSWORD, "compose": "compose.replica.yml"},
}

SHARED_DB_URL = f"postgres://postgres:${{POSTGRES_PASSWORD}}@{REDOT1}:5432/abc_io"
SHARED_REDIS_URL = f"redis://{REDOT1}:6379/0"
KIMI_ENDPOINTS = f"http://{REDOT1}:5000,http://{AI1}:5000,http://{AI2}:5000"


def build_bundle():
    """Create a gzipped tar of the local project."""
    exclude = {
        ".git", ".venv", "node_modules", "__pycache__", "repositories",
        "android-sdk", "postgres-data", "redis-data", "headscale-data",
    }
    ext_exclude = {".tar.gz", ".zip"}
    bundle_path = ROOT / BUNDLE_NAME
    with tarfile.open(bundle_path, "w:gz") as tar:
        for item in ROOT.iterdir():
            if item.name in exclude or item.name.endswith(tuple(ext_exclude)):
                continue
            tar.add(item, arcname=item.name)
    return bundle_path


def ssh_connect(ip, password):
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(ip, username=USER, password=password, timeout=15, banner_timeout=30, auth_timeout=30)
    return client


def upload_file(client, local_path, remote_path):
    sftp = client.open_sftp()
    try:
        sftp.put(str(local_path), remote_path)
    finally:
        sftp.close()


def run_remote(client, command, timeout=300):
    stdin, stdout, stderr = client.exec_command(command, timeout=timeout)
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    rc = stdout.channel.recv_exit_status()
    return rc, out, err


def deploy_node(name, info, bundle_path, env_path):
    ip = info["ip"]
    password = info["password"]
    compose = info["compose"]
    if not password:
        print(f"[WARN] No password for {name} ({ip}); skipping.")
        return False

    print(f"\n[DEPLOY] {name} ({ip}) using {compose}")
    client = ssh_connect(ip, password)
    try:
        # Prepare remote directory
        run_remote(client, f"mkdir -p {REMOTE_DIR} && rm -rf {REMOTE_DIR}/*")

        # Upload bundle and env
        upload_file(client, bundle_path, f"/tmp/{BUNDLE_NAME}")
        upload_file(client, env_path, f"/tmp/.env")

        # Extract
        rc, out, err = run_remote(client, f"cd {REMOTE_DIR} && tar -xzf /tmp/{BUNDLE_NAME} && cp /tmp/.env {REMOTE_DIR}/.env")
        if rc != 0:
            print(f"[ERROR] {name} extract failed: {err}")
            return False

        # For replica nodes, override DB/Redis URLs to point to redot1
        env_extra = ""
        if compose == "compose.replica.yml":
            env_extra = (
                f"echo 'DATABASE_URL={SHARED_DB_URL}' >> {REMOTE_DIR}/.env"
                f" && echo 'REDIS_URL={SHARED_REDIS_URL}' >> {REMOTE_DIR}/.env"
                f" && echo 'KIMI_ENDPOINTS={KIMI_ENDPOINTS}' >> {REMOTE_DIR}/.env"
            )
        else:
            env_extra = f"echo 'KIMI_ENDPOINTS={KIMI_ENDPOINTS}' >> {REMOTE_DIR}/.env"

        rc, out, err = run_remote(client, env_extra)
        if rc != 0:
            print(f"[ERROR] {name} env override failed: {err}")
            return False

        # Stop any old stack and deploy
        rc, out, err = run_remote(client, f"cd {REMOTE_DIR} && docker compose -f {compose} down --remove-orphans || true")
        rc, out, err = run_remote(client, f"cd {REMOTE_DIR} && docker compose -f {compose} pull && docker compose -f {compose} up -d --build", timeout=600)
        if rc != 0:
            print(f"[ERROR] {name} deploy failed: {err}")
            return False

        # Apply database patch on the primary node (postgres runs there)
        if compose == "compose.prod.yml":
            time.sleep(10)
            rc, out, err = run_remote(client, f"cd {REMOTE_DIR} && docker compose -f {compose} cp services/postgres/v5.0.0-patch.sql postgres:/tmp/v5.0.0-patch.sql && docker compose -f {compose} exec -T postgres psql -U postgres -d abc_io -f /tmp/v5.0.0-patch.sql", timeout=120)
            if rc != 0:
                print(f"[WARN] {name} DB patch apply failed: {err}")

        print(f"[OK] {name} deployed.")
        return True
    finally:
        client.close()


def wait_for_node(ip, port, path="/health", timeout=180):
    import socket
    import urllib.request
    start = time.time()
    while time.time() - start < timeout:
        try:
            with urllib.request.urlopen(f"http://{ip}:{port}{path}", timeout=5) as resp:
                if resp.status == 200:
                    return True
        except Exception:
            pass
        time.sleep(5)
    return False


def main():
    env_path = ROOT / ".env"
    if not env_path.exists():
        print("[ERROR] .env not found. Copy .env.example to .env and fill secrets.")
        sys.exit(1)

    missing_passwords = [n for n, info in NODES.items() if not info["password"]]
    if missing_passwords:
        print(f"[WARN] Missing passwords for: {', '.join(missing_passwords)}")

    print("[BUILD] Creating deployment bundle...")
    bundle_path = build_bundle()
    print(f"[BUILD] Bundle: {bundle_path} ({bundle_path.stat().st_size / 1024 / 1024:.1f} MB)")

    results = {}
    for name, info in NODES.items():
        results[name] = deploy_node(name, info, bundle_path, env_path)

    print("\n[VERIFY] Waiting for services to become healthy...")
    time.sleep(20)
    health_results = {}
    health_results["redot1_gateway"] = wait_for_node(REDOT1, 4000)
    health_results["redot1_portal"] = wait_for_node(REDOT1, 8090)
    health_results["ai1_gateway"] = wait_for_node(AI1, 4000)
    health_results["ai1_kimi"] = wait_for_node(AI1, 5000)
    health_results["ai2_gateway"] = wait_for_node(AI2, 4000)
    health_results["ai2_kimi"] = wait_for_node(AI2, 5000)

    print("\n[RESULTS]")
    for name, ok in results.items():
        print(f"  {name} deploy: {'OK' if ok else 'FAILED'}")
    for check, ok in health_results.items():
        print(f"  {check}: {'OK' if ok else 'FAILED'}")

    if not all(results.values()) or not all(health_results.values()):
        print("\n[ERROR] Deployment incomplete. Check logs above.")
        sys.exit(1)

    print("\n[SUCCESS] Triple-node deployment complete.")
    print(f"  Public portal: https://abc-io.com/")
    print(f"  Gateway nodes: {REDOT1}:4000, {AI1}:4000, {AI2}:4000")
    print(f"  AI nodes:      {REDOT1}:5000, {AI1}:5000, {AI2}:5000")


if __name__ == "__main__":
    main()
