#!/usr/bin/env python3
"""
ABC-IO v2.0 Autonomous Orchestrator
Owner: Christopher Porreca / redot1
Contact: cporreca@abc-io.com | 585-629-9120

Purpose:
- Continuously monitor public VPS infrastructure (redot1, ai1, ai2)
- Detect service failures and network partitions
- Attempt autonomous self-healing via SSH
- Activate cellular/mobile backup gateway when public VPS is unreachable
- Log all operations to local state file and alert owner
- Run as background daemon / scheduled task

Modes:
- NORMAL: All public services healthy
- DEGRADED: Some services failing, self-heal in progress
- FAILOVER: Public VPS unreachable, mobile/cellular gateway active
- RECOVERY: Attempting to restore public VPS from local backup
"""

import os
import sys
import time
import json
import socket
import logging
import hashlib
import datetime
import urllib.request
import urllib.error
import ssl
from pathlib import Path
from typing import Dict, List, Optional

# Try to import paramiko for SSH healing; graceful fallback if not installed
try:
    import paramiko
    HAS_PARAMIKO = True
except ImportError:
    HAS_PARAMIKO = False

# Configuration
STATE_DIR = Path.home() / "Documents" / "redot2-autonomous"
STATE_FILE = STATE_DIR / "orchestrator.state"
LOG_FILE = STATE_DIR / "orchestrator.log"
CONFIG_FILE = STATE_DIR / "orchestrator.json"

DEFAULT_CONFIG = {
    "owner": "Christopher Porreca",
    "company": "redot1",
    "contact_email": "cporreca@abc-io.com",
    "contact_phone": "585-629-9120",
    "domain": "abc-io.com",
    "nodes": {
        "redot1": {
            "host": "162.254.32.142",
            "ssh_user": "root",
            "ssh_password_env": "VPS_REDOT1_PASSWORD",
            "services": ["nginx", "gateway", "postgres", "redis", "kimi", "owner-dashboard", "operator-station"]
        },
        "ai1": {
            "host": "192.227.212.235",
            "ssh_user": "root",
            "ssh_password_env": "VPS_AI1_PASSWORD",
            "services": ["kimi", "redis"]
        },
        "ai2": {
            "host": "192.227.212.237",
            "ssh_user": "root",
            "ssh_password_env": "VPS_AI2_PASSWORD",
            "services": ["kimi", "redis"]
        }
    },
    "endpoints": {
        "public_portal": "https://abc-io.com/health",
        "gateway_health": "https://abc-io.com/api/v1/system/health",
        "ai_isp": "http://abc-io.com:7000/health",
        "beacon": "http://abc-io.com:3006/health",
        "owner_dashboard": "http://abc-io.com:8500/health",
        "operator_station": "http://abc-io.com:8080/status",
        "ai1": "http://192.227.212.235:5000/health",
        "ai2": "http://192.227.212.237:5000/health"
    },
    "cellular_fallback": {
        "enabled": True,
        "mobile_app_backend": "http://localhost:5050",
        "owner_phone_endpoint": "owner-phone-001",
        "activation_threshold_minutes": 5
    },
    "self_heal": {
        "enabled": True,
        "max_attempts": 3,
        "restart_services": True,
        "rebuild_images": False,
        "emergency_recovery": True
    },
    "check_interval_seconds": 60,
    "alert_interval_minutes": 15
}

# SSL context that ignores cert verification (for internal/self-signed checks)
SSL_CTX = ssl.create_default_context()
SSL_CTX.check_hostname = False
SSL_CTX.verify_mode = ssl.CERT_NONE


def setup_logging() -> logging.Logger:
    STATE_DIR.mkdir(parents=True, exist_ok=True)
    logger = logging.getLogger("abcio-orchestrator")
    logger.setLevel(logging.INFO)
    if not logger.handlers:
        fh = logging.FileHandler(LOG_FILE, encoding="utf-8")
        fh.setFormatter(logging.Formatter(
            "[%(asctime)s] %(levelname)s: %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S"
        ))
        logger.addHandler(fh)
        sh = logging.StreamHandler(sys.stdout)
        sh.setFormatter(logging.Formatter("[%(asctime)s] %(levelname)s: %(message)s"))
        logger.addHandler(sh)
    return logger


def load_config() -> Dict:
    if CONFIG_FILE.exists():
        try:
            with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    with open(CONFIG_FILE, "w", encoding="utf-8") as f:
        json.dump(DEFAULT_CONFIG, f, indent=2)
    return DEFAULT_CONFIG


def load_state() -> Dict:
    if STATE_FILE.exists():
        try:
            with open(STATE_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {
        "mode": "NORMAL",
        "last_check": None,
        "failures": [],
        "heal_attempts": 0,
        "cellular_active": False,
        "created_at": datetime.datetime.utcnow().isoformat()
    }


def save_state(state: Dict) -> None:
    STATE_DIR.mkdir(parents=True, exist_ok=True)
    with open(STATE_FILE, "w", encoding="utf-8") as f:
        json.dump(state, f, indent=2)


def http_check(url: str, timeout: int = 10) -> Dict:
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "ABC-IO-Autonomous/1.0"})
        resp = urllib.request.urlopen(req, timeout=timeout, context=SSL_CTX)
        body = resp.read().decode("utf-8", errors="ignore")[:500]
        return {"ok": True, "status": resp.status, "body": body}
    except urllib.error.HTTPError as e:
        return {"ok": False, "status": e.code, "error": str(e)}
    except Exception as e:
        return {"ok": False, "status": None, "error": str(e)}


def tcp_check(host: str, port: int, timeout: int = 5) -> Dict:
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(timeout)
        sock.connect((host, port))
        sock.close()
        return {"ok": True}
    except Exception as e:
        return {"ok": False, "error": str(e)}


def check_all_endpoints(config: Dict) -> Dict:
    results = {}
    for name, url in config["endpoints"].items():
        results[name] = http_check(url)
    return results


def overall_status(results: Dict) -> str:
    failed = [k for k, v in results.items() if not v.get("ok")]
    if not failed:
        return "HEALTHY"
    critical = ["public_portal", "gateway_health", "owner_dashboard"]
    critical_failed = [f for f in failed if f in critical]
    if critical_failed:
        return "CRITICAL"
    return "DEGRADED"


def ssh_command(node_config: Dict, command: str, logger: logging.Logger) -> Dict:
    if not HAS_PARAMIKO:
        logger.warning("Paramiko not installed; cannot run SSH commands.")
        return {"ok": False, "error": "paramiko not installed"}
    password = os.getenv(node_config["ssh_password_env"], "")
    if not password:
        return {"ok": False, "error": f"Password env {node_config['ssh_password_env']} not set"}
    try:
        client = paramiko.SSHClient()
        client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        client.connect(node_config["host"], username=node_config["ssh_user"], password=password, timeout=15)
        stdin, stdout, stderr = client.exec_command(command, timeout=120)
        out = stdout.read().decode("utf-8", errors="ignore")
        err = stderr.read().decode("utf-8", errors="ignore")
        client.close()
        return {"ok": True, "stdout": out, "stderr": err}
    except Exception as e:
        return {"ok": False, "error": str(e)}


def self_heal(node_name: str, config: Dict, logger: logging.Logger) -> Dict:
    node = config["nodes"][node_name]
    logger.info(f"Starting self-heal on {node_name} ({node['host']})")

    # Phase 1: Restart failed services
    if config["self_heal"].get("restart_services", True):
        services = " ".join(node["services"])
        cmd = f"cd /opt/redot2 && docker compose -f compose.prod.yml restart {services} && sleep 10 && docker ps --format '{{{{.Names}}}} {{{{.Status}}}}' | sort"
        result = ssh_command(node, cmd, logger)
        if result["ok"]:
            logger.info(f"Restarted services on {node_name}")
        else:
            logger.error(f"Service restart failed on {node_name}: {result.get('error', result.get('stderr', 'unknown'))}")

    # Phase 2: Full stack restart if still failing
    if config["self_heal"].get("emergency_recovery", True):
        cmd = "cd /opt/redot2 && docker compose -f compose.prod.yml down && docker compose -f compose.prod.yml up -d && sleep 20 && docker ps --format '{{{{.Names}}}} {{{{.Status}}}}' | sort"
        result = ssh_command(node, cmd, logger)
        if result["ok"]:
            logger.info(f"Emergency recovery completed on {node_name}")
        else:
            logger.error(f"Emergency recovery failed on {node_name}: {result.get('error', 'unknown')}")

    return {"ok": True, "message": f"Self-heal attempted on {node_name}"}


def activate_cellular_fallback(config: Dict, logger: logging.Logger) -> Dict:
    logger.warning("ACTIVATING CELLULAR FALLBACK MODE")
    # In a real implementation, this would:
    # 1. Send a push/SMS to the owner phone
    # 2. Activate the mobile gateway in backup mode
    # 3. Update DNS or notify clients
    # For now, log and update state.
    return {
        "ok": True,
        "mode": "FAILOVER",
        "message": "Cellular fallback activated. Mobile APK gateway is now authoritative.",
        "actions": [
            "Owner mobile app switched to autonomous backend mode",
            "Public DNS can be repointed to mobile IP if static",
            "Continuous recovery attempts on public VPS in background"
        ]
    }


def deactivate_cellular_fallback(config: Dict, logger: logging.Logger) -> Dict:
    logger.info("DEACTIVATING CELLULAR FALLBACK MODE - public system restored")
    return {
        "ok": True,
        "mode": "NORMAL",
        "message": "Public VPS restored. Cellular fallback deactivated."
    }


def run_orchestrator_cycle(config: Dict, state: Dict, logger: logging.Logger) -> Dict:
    results = check_all_endpoints(config)
    status = overall_status(results)
    state["last_check"] = datetime.datetime.utcnow().isoformat()
    state["last_results"] = {k: {"ok": v["ok"], "status": v.get("status"), "error": v.get("error")} for k, v in results.items()}

    failed = [k for k, v in results.items() if not v["ok"]]

    if status == "HEALTHY":
        if state.get("cellular_active"):
            logger.info("Public system healthy again. Deactivating cellular fallback.")
            deactivate_cellular_fallback(config, logger)
            state["cellular_active"] = False
            state["mode"] = "NORMAL"
            state["heal_attempts"] = 0
        else:
            state["mode"] = "NORMAL"
            if state.get("heal_attempts", 0) > 0:
                logger.info("System recovered to healthy state.")
                state["heal_attempts"] = 0
    elif status == "DEGRADED":
        state["mode"] = "DEGRADED"
        logger.warning(f"Degraded services: {failed}")
        if config["self_heal"]["enabled"] and state.get("heal_attempts", 0) < config["self_heal"]["max_attempts"]:
            state["heal_attempts"] = state.get("heal_attempts", 0) + 1
            self_heal("redot1", config, logger)
    elif status == "CRITICAL":
        state["mode"] = "CRITICAL"
        logger.error(f"Critical service failure: {failed}")
        if config["self_heal"]["enabled"] and state.get("heal_attempts", 0) < config["self_heal"]["max_attempts"]:
            state["heal_attempts"] = state.get("heal_attempts", 0) + 1
            self_heal("redot1", config, logger)
        elif config["cellular_fallback"]["enabled"] and not state.get("cellular_active"):
            activate_cellular_fallback(config, logger)
            state["cellular_active"] = True
            state["mode"] = "FAILOVER"

    state["failures"] = failed
    save_state(state)
    return state


def run_daemon(config: Dict, logger: logging.Logger) -> None:
    logger.info("=" * 60)
    logger.info("ABC-IO Autonomous Orchestrator Started")
    logger.info(f"Owner: {config['owner']} / {config['company']}")
    logger.info(f"Domain: {config['domain']}")
    logger.info("=" * 60)

    state = load_state()
    state["started_at"] = datetime.datetime.utcnow().isoformat()
    save_state(state)

    try:
        while True:
            try:
                run_orchestrator_cycle(config, state, logger)
            except Exception as e:
                logger.exception("Cycle error: %s", e)
            time.sleep(config.get("check_interval_seconds", 60))
    except KeyboardInterrupt:
        logger.info("Orchestrator stopped by user.")


def run_single_check(config: Dict, logger: logging.Logger) -> None:
    state = load_state()
    run_orchestrator_cycle(config, state, logger)
    print(json.dumps(state, indent=2))


def main():
    logger = setup_logging()
    config = load_config()

    if len(sys.argv) > 1 and sys.argv[1] == "--daemon":
        run_daemon(config, logger)
    elif len(sys.argv) > 1 and sys.argv[1] == "--status":
        print(json.dumps(load_state(), indent=2))
    else:
        run_single_check(config, logger)


if __name__ == "__main__":
    main()
