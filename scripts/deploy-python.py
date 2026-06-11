#!/usr/bin/env python3
import os
import sys
import time
import paramiko

sys.stdout = os.fdopen(sys.stdout.fileno(), 'w', 1)

NODES = {
    "redot1": {"ip": os.getenv("VPS_REDOT1_IP", "162.254.32.142"), "password": os.getenv("VPS_REDOT1_PASSWORD"), "services": ""},
    "ai1":    {"ip": os.getenv("VPS_AI1_IP", "192.227.212.235"), "password": os.getenv("VPS_AI1_PASSWORD"), "services": "kimi worker redis headscale"},
    "ai2":    {"ip": os.getenv("VPS_AI2_IP", "192.227.212.237"), "password": os.getenv("VPS_AI2_PASSWORD"), "services": "kimi worker redis headscale"},
}

PROJECT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEPLOY_TAG = os.popen("git -C {} rev-parse --short HEAD".format(PROJECT_DIR)).read().strip()
BUNDLE_NAME = "abc-io-deploy-{}.tar.gz".format(DEPLOY_TAG)
BUNDLE_PATH = os.path.join(PROJECT_DIR, BUNDLE_NAME)
ENV_PATH = os.path.join(PROJECT_DIR, ".env")

def log(msg):
    print(msg)
    sys.stdout.flush()

def run_cmd(ssh, command, timeout=60):
    stdin, stdout, stderr = ssh.exec_command(command, timeout=timeout, get_pty=True)
    exit_code = stdout.channel.recv_exit_status()
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    return out, err, exit_code

def deploy_node(name, config):
    ip = config["ip"]
    password = config["password"]
    services = config["services"]

    if not password:
        log("  [FAIL] No VPS password set in environment for {}. Set VPS_{}_PASSWORD.".format(name, name.upper()))
        return False

    log("")
    log("=" * 60)
    log("[{}] Deploying to {}...".format(name, ip))
    log("=" * 60)

    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        ssh.connect(ip, username="root", password=password, timeout=15, look_for_keys=False)
        log("  [OK] SSH connected")
    except Exception as e:
        log("  [FAIL] SSH: {}".format(e))
        return False

    try:
        log("  Disk check...")
        out, err, code = run_cmd(ssh, "df -h / | tail -1")
        log("    {}".format(out.strip()))
        try:
            usage_pct = int(out.split()[4].replace("%", ""))
            if usage_pct > 80:
                log("  [WARN] Disk {}%. Pruning...".format(usage_pct))
                run_cmd(ssh, "docker system prune -af --volumes 2>/dev/null || true", timeout=120)
        except:
            pass

        log("  Docker check...")
        out, err, code = run_cmd(ssh, "docker compose version")
        if code != 0:
            out2, err2, code2 = run_cmd(ssh, "docker-compose version || which docker")
            if code2 != 0:
                log("  [WARN] Docker missing. Installing...")
                run_cmd(ssh, "apt-get update -qq && apt-get install -y -qq docker.io docker-compose-plugin 2>/dev/null || true", timeout=300)
                run_cmd(ssh, "systemctl start docker 2>/dev/null || service docker start 2>/dev/null || true", timeout=30)
            else:
                log("  [WARN] Docker Compose v2 missing. Installing plugin...")
                run_cmd(ssh, "apt-get update -qq && apt-get install -y -qq docker-compose-plugin 2>/dev/null || mkdir -p /usr/local/lib/docker/cli-plugins && curl -SL https://github.com/docker/compose/releases/download/v2.27.0/docker-compose-linux-x86_64 -o /usr/local/lib/docker/cli-plugins/docker-compose && chmod +x /usr/local/lib/docker/cli-plugins/docker-compose", timeout=120)
        else:
            log("    Docker OK: {}".format(out.strip().split('\n')[0]))

        run_cmd(ssh, "mkdir -p /opt")

        log("  Uploading bundle...")
        sftp = ssh.open_sftp()
        sftp.put(BUNDLE_PATH, "/opt/{}".format(BUNDLE_NAME))
        sftp.close()
        log("  [OK] Bundle uploaded")

        log("  Extracting bundle...")
        out, err, code = run_cmd(ssh, "cd /opt && rm -rf abc-io && tar -xzf {}".format(BUNDLE_NAME), timeout=120)
        if code != 0:
            log("  [FAIL] Extract failed: {}".format(err))
            return False
        log("  [OK] Extracted")

        if os.path.exists(ENV_PATH):
            log("  Uploading .env...")
            sftp = ssh.open_sftp()
            sftp.put(ENV_PATH, "/opt/abc-io/.env")
            sftp.close()
            log("  [OK] .env uploaded")
        else:
            log("  [WARN] .env not found locally")

        log("  Starting services...")
        if services:
            cmd = 'cd /opt/abc-io && docker system prune -af --volumes >/dev/null 2>&1 || true && docker-compose -f compose.prod.yml up -d {}'.format(services)
        else:
            cmd = 'cd /opt/abc-io && bash startup.sh'

        out, err, code = run_cmd(ssh, cmd, timeout=600)
        for line in out.split('\n'):
            if line.strip():
                log("    {}".format(line.rstrip()))
        if err.strip():
            for line in err.split('\n')[:5]:
                if line.strip():
                    log("    err: {}".format(line.rstrip()))
        if code != 0:
            log("  [FAIL] Startup exit code {}".format(code))
            return False

        log("  Health check...")
        time.sleep(3)
        ports = [4000, 8500, 8090] if name == "redot1" else [5000]
        for port in ports:
            out, err, code = run_cmd(ssh, "curl -sf http://localhost:{}/health || curl -sf http://localhost:{}/".format(port, port))
            if code == 0:
                log("    Port {}: [OK]".format(port))
            else:
                log("    Port {}: [CHECK]".format(port))

        log("  [OK] {} done.".format(name))
        return True
    except Exception as e:
        log("  [FAIL] {}".format(e))
        return False
    finally:
        ssh.close()

def main():
    log("=" * 60)
    log("ABC-IO v2.0 Deployment")
    log("Bundle: {}".format(BUNDLE_NAME))
    log("=" * 60)

    if not os.path.exists(BUNDLE_PATH):
        log("ERROR: Bundle not found: {}".format(BUNDLE_PATH))
        sys.exit(1)

    results = {}
    for name, config in NODES.items():
        results[name] = deploy_node(name, config)

    log("")
    log("=" * 60)
    log("SUMMARY")
    log("=" * 60)
    for name, ok in results.items():
        log("  {}: {}".format(name, "[OK]" if ok else "[FAIL]"))

    if all(results.values()):
        log(">>> All nodes deployed!")
    else:
        log("[WARN] Some nodes failed.")
        sys.exit(1)

if __name__ == "__main__":
    main()
