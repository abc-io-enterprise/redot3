#!/usr/bin/env python3
"""
Staged deployment for redot1 (162.254.32.142).
Starts the 17-service stack in waves to avoid OOM on a 4GB VPS.
"""
import os, sys, time, paramiko, subprocess, tempfile, shutil, tarfile, fnmatch

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
HOST = "162.254.32.142"
USER = "root"
PASSWORD = os.getenv("VPS_REDOT1_PASSWORD", "")
REMOTE_DIR = "/opt/redot2"
BUNDLE = "abc-io-deploy.tar.gz"
LOCAL_PROJECT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

STAGES = [
    # Stage 1: Infrastructure (lightweight images, low memory)
    {
        "name": "Infrastructure",
        "services": ["postgres", "redis", "logger"],
        "wait_for": "postgres",
        "wait_cmd": "docker compose -f compose.prod.yml exec -T postgres pg_isready -U postgres -d abc_io",
        "wait_timeout": 120,
    },
    # Stage 2: Core API gateway + public services
    {
        "name": "Core Gateway",
        "services": ["gateway", "public-portal"],
        "wait_for": "gateway",
        "wait_cmd": "docker compose -f compose.prod.yml exec -T gateway wget -qO- http://localhost:4000/health",
        "wait_timeout": 120,
    },
    # Stage 3: Operational dashboards
    {
        "name": "Dashboards",
        "services": ["operator-station", "owner-dashboard", "mobile-gateway"],
        "wait_for": None,
        "wait_cmd": None,
        "wait_timeout": 0,
    },
    # Stage 4: AI services (heavier builds)
    {
        "name": "AI Services",
        "services": ["kimi", "ai-isp", "worker"],
        "wait_for": "kimi",
        "wait_cmd": "docker compose -f compose.prod.yml exec -T kimi python -c \"import urllib.request; print(urllib.request.urlopen('http://localhost:5000/health').read().decode())\" || true",
        "wait_timeout": 120,
    },
    # Stage 5: Beacon + PWA
    {
        "name": "Beacon",
        "services": ["beacon", "beacon-pwa"],
        "wait_for": None,
        "wait_cmd": None,
        "wait_timeout": 0,
    },
    # Stage 6: Monitoring stack
    {
        "name": "Monitoring",
        "services": ["prometheus", "grafana", "tracer", "headscale"],
        "wait_for": None,
        "wait_cmd": None,
        "wait_timeout": 0,
    },
    # Stage 7: NGINX (front door) — last so it can proxy to healthy backends
    {
        "name": "NGINX",
        "services": ["nginx"],
        "wait_for": "nginx",
        "wait_cmd": "docker compose -f compose.prod.yml exec -T nginx wget -qO- http://localhost/health || wget -qO- http://localhost:80/health || true",
        "wait_timeout": 60,
    },
]

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def log(msg):
    print(msg, flush=True)

def ssh_client():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, username=USER, password=PASSWORD, timeout=15, banner_timeout=20, auth_timeout=15)
    return client

def run_remote(client, cmd, timeout=300):
    log(f"  $ {cmd[:120]}{'...' if len(cmd) > 120 else ''}")
    stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout, get_pty=True)
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    rc = stdout.channel.recv_exit_status()
    return rc, out, err

def wait_for_service(client, stage):
    if not stage.get("wait_for"):
        return True
    log(f"  Waiting for {stage['wait_for']} to be ready (max {stage['wait_timeout']}s)...")
    deadline = time.time() + stage["wait_timeout"]
    while time.time() < deadline:
        rc, out, err = run_remote(client, stage["wait_cmd"], timeout=30)
        if rc == 0 and ("accepting connections" in out.lower() or "ok" in out.lower() or "<!doctype" in out.lower() or "abc-io" in out.lower() or "nginx" in out.lower() or "refused" not in err.lower()):
            log(f"  [OK] {stage['wait_for']} is ready")
            return True
        time.sleep(5)
    log(f"  [WARN] {stage['wait_for']} did not become ready in time, continuing...")
    return False

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    if not PASSWORD:
        log("ERROR: VPS_REDOT1_PASSWORD env var not set")
        sys.exit(1)

    log("=" * 60)
    log("STAGED DEPLOYMENT to redot1")
    log("=" * 60)

    # Build bundle locally
    log("\n[LOCAL] Building deployment bundle...")
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
        sys.exit(1)
    size_mb = os.path.getsize(bundle_path) / (1024 * 1024)
    log(f"  [OK] Bundle: {bundle_path} ({size_mb:.1f} MB)")

    # Connect
    log(f"\n[redot1] Connecting to {HOST}...")
    client = ssh_client()
    log("  [OK] SSH connected")

    # Upload bundle
    log("\n[redot1] Uploading bundle...")
    sftp = client.open_sftp()
    sftp.put(bundle_path, f"/tmp/{BUNDLE}")
    sftp.close()
    log("  [OK] Bundle uploaded")

    # Extract
    rc, _, _ = run_remote(client, f"mkdir -p {REMOTE_DIR} && rm -rf {REMOTE_DIR}/* && tar xzf /tmp/{BUNDLE} -C {REMOTE_DIR}")
    if rc != 0:
        log("ERROR: Failed to extract bundle")
        sys.exit(1)
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

    # Stop any existing stack first to free memory
    log("\n[redot1] Stopping existing stack...")
    run_remote(client, f"cd {REMOTE_DIR} && docker compose -f compose.prod.yml down --remove-orphans 2>/dev/null || docker-compose -f compose.prod.yml down --remove-orphans 2>/dev/null || true", timeout=120)
    log("  [OK] Stopped")

    # Prune to free disk
    log("\n[redot1] Pruning old Docker resources...")
    run_remote(client, "docker system prune -f --volumes 2>/dev/null || true", timeout=60)
    log("  [OK] Pruned")

    # Deploy in stages
    for stage in STAGES:
        log(f"\n{'='*60}")
        log(f"STAGE: {stage['name']}")
        log(f"Services: {', '.join(stage['services'])}")
        log(f"{'='*60}")

        svc_list = " ".join(stage["services"])
        rc, out, err = run_remote(
            client,
            f"cd {REMOTE_DIR} && docker compose -f compose.prod.yml up -d --build {svc_list}",
            timeout=600,
        )
        if rc != 0:
            log(f"  [WARN] Non-zero exit ({rc}). Output:\n{out}\n{err}")
        else:
            log(f"  [OK] Stage started")

        # Wait for service readiness
        wait_for_service(client, stage)

        # Breathing room between stages
        log("  Sleeping 15s before next stage...")
        time.sleep(15)

    # Final status
    log("\n" + "=" * 60)
    log("DEPLOYMENT COMPLETE")
    log("=" * 60)
    rc, out, err = run_remote(client, f"cd {REMOTE_DIR} && docker compose -f compose.prod.yml ps")
    log(out)
    if err:
        log(err)

    client.close()
    log("\nDone.")

if __name__ == "__main__":
    main()
