#!/usr/bin/env python3
"""
ABC-IO v2.0 Autonomous Backend Service
Containerized self-healing orchestrator that runs inside the redot2 stack.

Responsibilities:
- Health-check all redot2 services via Docker health + HTTP probes
- Detect failures and attempt container-level self-heal
- Expose /health and /status endpoints for operator-station
- Queue critical alerts in Redis for the worker to process
- Coordinate with desktop orchestrator via state files
"""

import os
import sys
import time
import json
import socket
import logging
import datetime
import urllib.request
import urllib.error
import ssl
import subprocess
import redis

SSL_CTX = ssl.create_default_context()
SSL_CTX.check_hostname = False
SSL_CTX.verify_mode = ssl.CERT_NONE

SERVICES = [
    {"name": "nginx", "url": "http://nginx:80/health", "docker": True},
    {"name": "gateway", "url": "http://gateway:4000/health", "docker": True},
    {"name": "operator-station", "url": "http://operator-station:8080/status", "docker": True},
    {"name": "owner-dashboard", "url": "http://owner-dashboard:8500/health", "docker": True},
    {"name": "mobile-gateway", "url": "http://mobile-gateway:5050/health", "docker": True},
    {"name": "public-portal", "url": "http://public-portal:8090/health", "docker": True},
    {"name": "beacon-pwa", "url": "http://beacon-pwa:3005/health", "docker": True},
    {"name": "beacon", "url": "http://beacon:3006/health", "docker": True},
    {"name": "kimi", "url": "http://kimi:5000/health", "docker": True},
    {"name": "ai-isp", "url": "http://ai-isp:7000/health", "docker": True},
    {"name": "postgres", "tcp": ("postgres", 5432), "docker": True},
    {"name": "redis", "tcp": ("redis", 6379), "docker": True},
]

logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] %(levelname)s: %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger("autonomous-backend")


def http_check(url, timeout=8):
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "ABC-IO-Autonomous/2.0"})
        resp = urllib.request.urlopen(req, timeout=timeout, context=SSL_CTX)
        return {"ok": True, "status": resp.status}
    except Exception as e:
        return {"ok": False, "error": str(e)}


def tcp_check(host, port, timeout=5):
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(timeout)
        s.connect((host, port))
        s.close()
        return {"ok": True}
    except Exception as e:
        return {"ok": False, "error": str(e)}


def docker_ps():
    try:
        out = subprocess.check_output(
            ["docker", "ps", "--format", "{{.Names}}\t{{.Status}}\t{{.Image}}"],
            stderr=subprocess.STDOUT, timeout=30
        )
        lines = out.decode("utf-8", errors="ignore").strip().split("\n")
        result = {}
        for line in lines:
            parts = line.split("\t")
            if len(parts) >= 2:
                result[parts[0]] = parts[1]
        return result
    except Exception as e:
        logger.error("docker ps failed: %s", e)
        return {}


def restart_service(name):
    try:
        subprocess.check_call(
            ["docker", "compose", "-f", "/opt/redot2/compose.prod.yml", "restart", name],
            timeout=120
        )
        return True
    except Exception as e:
        logger.error("Failed to restart %s: %s", name, e)
        return False


def get_redis():
    redis_url = os.getenv("REDIS_URL", "redis://redis:6379/0")
    try:
        return redis.from_url(redis_url, decode_responses=True)
    except Exception as e:
        logger.warning("Redis connection failed: %s", e)
        return None


def run_cycle(state):
    results = {}
    docker_status = docker_ps()

    for svc in SERVICES:
        name = svc["name"]
        if "url" in svc:
            results[name] = http_check(svc["url"])
        elif "tcp" in svc:
            results[name] = tcp_check(svc["tcp"][0], svc["tcp"][1])
        results[name]["docker_status"] = docker_status.get(name, "unknown")

    failed = [k for k, v in results.items() if not v["ok"]]
    state["last_check"] = datetime.datetime.utcnow().isoformat()
    state["results"] = results
    state["failed"] = failed

    if failed:
        logger.warning("Failed services: %s", failed)
        for name in failed:
            if state.get("heal_counts", {}).get(name, 0) < 3:
                logger.info("Attempting to restart %s", name)
                restart_service(name)
                state.setdefault("heal_counts", {})[name] = state.get("heal_counts", {}).get(name, 0) + 1
    else:
        state["heal_counts"] = {}

    # Alert via Redis
    r = get_redis()
    if r and failed:
        alert = {
            "type": "autonomous_alert",
            "timestamp": state["last_check"],
            "failed": failed,
            "severity": "critical" if len(failed) > 2 else "warning"
        }
        try:
            r.lpush("redot2:jobs:queue", json.dumps({"type": "autonomous_alert", "payload": alert}))
        except Exception as e:
            logger.warning("Redis alert failed: %s", e)

    state["mode"] = "CRITICAL" if len(failed) > 2 else ("DEGRADED" if failed else "HEALTHY")
    return state


def main():
    logger.info("ABC-IO Autonomous Backend Service started")
    state = {"mode": "HEALTHY", "heal_counts": {}}
    interval = int(os.getenv("CHECK_INTERVAL_SECONDS", "30"))
    while True:
        try:
            run_cycle(state)
            logger.info("Cycle complete. Mode: %s", state["mode"])
        except Exception as e:
            logger.exception("Cycle error: %s", e)
        time.sleep(interval)


if __name__ == "__main__":
    main()
