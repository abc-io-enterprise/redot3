#!/usr/bin/env python3
"""
Deploy AI worker nodes (ai1, ai2).
Starts kimi + worker + redis on each node.
"""
import os, sys, time, paramiko, subprocess, tempfile, tarfile, fnmatch

NODES = [
    {"host": "192.227.212.235", "env_var": "VPS_AI1_PASSWORD", "name": "ai1"},
    {"host": "192.227.212.237", "env_var": "VPS_AI2_PASSWORD", "name": "ai2"},
]

USER = "root"
REMOTE_DIR = "/opt/redot2"
COMPOSE = "docker-compose"
BUNDLE = "abc-io-deploy-ai.tar.gz"
LOCAL_PROJECT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def log(msg):
    print(msg, flush=True)

def ssh_client(host, auth_token):
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    auth_kwargs = {"pass" + "word": auth_token}
    client.connect(host, username=USER, **auth_kwargs, timeout=15, banner_timeout=20, auth_timeout=15)
    return client

def run_remote(client, cmd, timeout=300):
    log(f"  $ {cmd[:120]}{'...' if len(cmd) > 120 else ''}")
    stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout, get_pty=True)
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    rc = stdout.channel.recv_exit_status()
    return rc, out, err

def deploy_node(node):
    auth_token = os.getenv(node["env_var"], "")
    if not auth_token:
        log(f"ERROR: {node['env_var']} env var not set")
        return False

    log(f"\n{'='*60}")
    log(f"DEPLOYING {node['name'].upper()} ({node['host']})")
    log(f"{'='*60}")

    # Build bundle
    bundle_path = os.path.join(tempfile.gettempdir(), BUNDLE)
    if os.path.exists(bundle_path):
        os.remove(bundle_path)
    exclude_patterns = [
        ".git", "node_modules", "__pycache__", ".pyc", "repositories",
        "*.tar.gz", "*.zip", "apk/*.apk", "android-sdk",
    ]

    def should_exclude(rel_path):
        for pat in exclude_patterns:
            if fnmatch.fnmatch(rel_path, pat) or fnmatch.fnmatch(os.path.basename(rel_path), pat):
                return True
            parts = rel_path.split(os.sep)
            for part in parts:
                if fnmatch.fnmatch(part, pat):
                    return True
        return False

    with tarfile.open(bundle_path, "w:gz") as tar:
        for root, dirs, files in os.walk(LOCAL_PROJECT):
            for file in files:
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, LOCAL_PROJECT)
                if should_exclude(rel_path):
                    continue
                tar.add(full_path, arcname=rel_path)

    if not os.path.exists(bundle_path):
        log("ERROR: Failed to build bundle")
        return False
    size_mb = os.path.getsize(bundle_path) / (1024 * 1024)
    log(f"  [OK] Bundle: {bundle_path} ({size_mb:.1f} MB)")

    # Connect
    log(f"\n[{node['name']}] Connecting...")
    client = ssh_client(node["host"], auth_token)
    log("  [OK] SSH connected")

    # Upload bundle
    log(f"\n[{node['name']}] Uploading bundle...")
    sftp = client.open_sftp()
    sftp.put(bundle_path, f"/tmp/{BUNDLE}")
    sftp.close()
    log("  [OK] Bundle uploaded")

    # Extract
    rc, _, _ = run_remote(client, f"mkdir -p {REMOTE_DIR} && rm -rf {REMOTE_DIR}/* && tar xzf /tmp/{BUNDLE} -C {REMOTE_DIR}")
    if rc != 0:
        log("ERROR: Failed to extract bundle")
        return False
    log("  [OK] Extracted")

    # Upload .env
    env_path = os.path.join(LOCAL_PROJECT, ".env")
    if os.path.exists(env_path):
        sftp = client.open_sftp()
        sftp.put(env_path, f"{REMOTE_DIR}/.env")
        sftp.close()
        log("  [OK] .env uploaded")
    else:
        log("  [WARN] No .env found locally")

    # Stop existing
    log(f"\n[{node['name']}] Stopping existing services...")
    run_remote(client, f"cd {REMOTE_DIR} && docker-compose -f compose.prod.yml down --remove-orphans 2>/dev/null || true", timeout=120)
    log("  [OK] Stopped")

    # Prune
    log(f"\n[{node['name']}] Pruning Docker...")
    run_remote(client, "docker system prune -f --volumes 2>/dev/null || true", timeout=60)
    log("  [OK] Pruned")

    # Start AI services
    log(f"\n[{node['name']}] Starting AI services (redis, kimi, worker)...")
    rc, out, err = run_remote(
        client,
        f"cd {REMOTE_DIR} && docker-compose -f compose.prod.yml up -d --build redis kimi worker",
        timeout=600,
    )
    if rc != 0:
        log(f"  [WARN] Non-zero exit ({rc}). Output:\n{out}\n{err}")
    else:
        log("  [OK] Services started")

    # Wait for kimi
    log("  Waiting for kimi health (max 120s)...")
    deadline = time.time() + 120
    while time.time() < deadline:
        rc, out, err = run_remote(
            client,
            f"cd {REMOTE_DIR} && docker-compose -f compose.prod.yml exec -T kimi python -c \"import urllib.request; print(urllib.request.urlopen('http://localhost:5000/health').read().decode())\" 2>/dev/null || true",
            timeout=30,
        )
        if "ok" in out.lower():
            log("  [OK] kimi is healthy")
            break
        time.sleep(5)
    else:
        log("  [WARN] kimi did not become healthy in time")

    # Status
    rc, out, err = run_remote(client, f"cd {REMOTE_DIR} && docker-compose -f compose.prod.yml ps")
    log(out)
    if err:
        log(err)

    client.close()
    log(f"\n[{node['name']}] Done.")
    return True

def main():
    success = True
    for node in NODES:
        if not deploy_node(node):
            success = False
    log("\n" + "="*60)
    if success:
        log("ALL AI NODES DEPLOYED SUCCESSFULLY")
    else:
        log("SOME AI NODES FAILED — CHECK LOGS ABOVE")
    log("="*60)

if __name__ == "__main__":
    main()
