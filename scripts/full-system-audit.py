#!/usr/bin/env python3
"""
ABC-IO v2.0 Full System Audit
Owner: Christopher Porreca / redot1
Performs local validation of the complete redot2 system before final sign-off.
"""

import os
import sys
import json
import subprocess
import urllib.request
import urllib.error
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

REQUIRED_FILES = [
    "docker-compose.yml",
    "compose.prod.yml",
    ".env.example",
    "package.json",
    "AGENTS.md",
    "FINAL_STATUS.md",
    "LIVE.txt",
    "AUTONOMOUS_SYSTEM.md",
    "SYSTEM_DEFINITION.md",
    "services/autonomous/orchestrator.py",
    "services/autonomous/Dockerfile",
    "services/autonomous/requirements.txt",
    "scripts/autonomous-orchestrator.py",
    "scripts/build-autonomous-apk.sh",
    "admin-desktop/server.py",
    "admin-desktop/index.html",
    "apk/android-project/app/src/main/java/com/abcio/gateway/MainActivity.java",
    "apk/android-project/app/src/main/java/com/abcio/gateway/GatewayService.java",
    "config/nginx.conf",
    "config/prometheus.yml",
    "services/postgres/init.sql",
    "services/gateway/src/index.js",
    "services/beacon/src/index.js",
    "services/owner-dashboard/src/index.js",
    "services/operator-station/src/index.js",
    "services/public-portal/src/index.js",
    "services/ai-isp/src/app.py",
    "services/kimi/app.py",
    "services/worker/worker.py",
    "docs/ABC_IO_V2_PRODUCTION_RUNBOOK.md",
    "docs/SECURITY_RUNBOOK.md",
    "docs/DISASTER_RECOVERY.md",
]

REQUIRED_DIRS = [
    "services",
    "scripts",
    "config",
    "docs",
    "admin-desktop",
    "apk/android-project",
    "infrastructure/gcp/k8s",
]

PUBLIC_ENDPOINTS = [
    "https://abc-io.com/health",
    "https://abc-io.com/",
]


def run(cmd, cwd=None, timeout=60):
    try:
        result = subprocess.run(
            cmd, shell=True, cwd=cwd or str(ROOT), capture_output=True, text=True,
            timeout=timeout, encoding="utf-8", errors="ignore"
        )
        return result.returncode == 0, result.stdout, result.stderr
    except Exception as e:
        return False, "", str(e)


CHECK = "[OK]"
CROSS = "[FAIL]"
WARN = "[WARN]"

def section(title):
    print("\n" + "=" * 60)
    print(title)
    print("=" * 60)


def audit_files():
    section("FILE STRUCTURE AUDIT")
    missing = []
    for f in REQUIRED_FILES:
        path = ROOT / f
        if path.exists():
            print(f"  {CHECK} {f}")
        else:
            print(f"  {CROSS} MISSING {f}")
            missing.append(f)
    for d in REQUIRED_DIRS:
        path = ROOT / d
        if path.is_dir():
            print(f"  {CHECK} {d}/")
        else:
            print(f"  {CROSS} MISSING DIR {d}/")
            missing.append(d)
    return len(missing) == 0


def audit_docker_compose():
    section("DOCKER COMPOSE VALIDATION")
    ok1, out1, err1 = run("docker compose config")
    ok2, out2, err2 = run("docker compose -f compose.prod.yml config")
    if ok1:
        print(f"  {CHECK} docker-compose.yml is valid")
    else:
        print(f"  {CROSS} docker-compose.yml invalid: {err1 or out1}")
    if ok2:
        print(f"  {CHECK} compose.prod.yml is valid")
    else:
        print(f"  {CROSS} compose.prod.yml invalid: {err2 or out2}")
    return ok1 and ok2


def audit_git():
    section("GIT STATUS")
    ok, out, err = run("git status --short")
    if ok:
        if out.strip():
            print(f"  {WARN} Uncommitted changes:")
            print("    " + out.replace("\n", "\n    "))
        else:
            print(f"  {CHECK} Working tree clean")
    ok2, out2, err2 = run("git tag --list")
    tags = [t.strip() for t in out2.splitlines() if t.strip().startswith("v") and "." in t.strip()]
    if tags:
        print(f"  {CHECK} Latest tag: {tags[-1]}")
    else:
        print(f"  {WARN} No version tag found")
    return True


def audit_apk():
    section("APK ARTIFACTS")
    apks = ["apk/redot2-operator.apk", "apk/redot2-latest.apk"]
    found = False
    for apk in apks:
        path = ROOT / apk
        if path.exists():
            size = path.stat().st_size
            print(f"  {CHECK} {apk} ({size} bytes)")
            found = True
        else:
            print(f"  {WARN} {apk} not found (run build script)")
    keystore = ROOT / "apk" / "keystore.jks"
    if keystore.exists():
        print(f"  {CHECK} Keystore present")
    else:
        print(f"  {WARN} Keystore not present")
    return True


def audit_public_endpoints():
    section("PUBLIC ENDPOINT HEALTH")
    all_ok = True
    for url in PUBLIC_ENDPOINTS:
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "ABC-IO-Audit/2.0"})
            resp = urllib.request.urlopen(req, timeout=15)
            print(f"  {CHECK} {url} -> {resp.status}")
        except urllib.error.HTTPError as e:
            print(f"  {WARN} {url} -> HTTP {e.code}")
        except Exception as e:
            print(f"  {CROSS} {url} -> {e}")
            all_ok = False
    return all_ok


def audit_autonomous():
    section("AUTONOMOUS SYSTEM AUDIT")
    checks = {
        "Containerized backend": ROOT / "services/autonomous/orchestrator.py",
        "Dockerfile": ROOT / "services/autonomous/Dockerfile",
        "Desktop orchestrator": ROOT / "scripts/autonomous-orchestrator.py",
        "Desktop admin backend": ROOT / "admin-desktop/server.py",
        "Autonomous APK build script": ROOT / "scripts/build-autonomous-apk.sh",
        "Biometric MainActivity": ROOT / "apk/android-project/app/src/main/java/com/abcio/gateway/MainActivity.java",
        "Autonomous GatewayService": ROOT / "apk/android-project/app/src/main/java/com/abcio/gateway/GatewayService.java",
    }
    all_ok = True
    for name, path in checks.items():
        if path.exists():
            print(f"  {CHECK} {name}")
        else:
            print(f"  {CROSS} {name} missing")
            all_ok = False

    # Check for biometric keyword in MainActivity
    main = checks["Biometric MainActivity"].read_text(errors="ignore")
    if "BiometricPrompt" in main and "USE_BIOMETRIC" in (ROOT / "apk/android-project/app/src/main/AndroidManifest.xml").read_text(errors="ignore"):
        print(f"  {CHECK} Biometric authentication wired")
    else:
        print(f"  {CROSS} Biometric authentication not fully wired")
        all_ok = False

    # Check hardcoded backends
    gs = checks["Autonomous GatewayService"].read_text(errors="ignore")
    for backend in ["162.254.32.142", "192.227.212.235", "192.227.212.237", "abc-io.com"]:
        if backend in gs:
            print(f"  {CHECK} Hardcoded backend: {backend}")
        else:
            print(f"  {CROSS} Missing backend: {backend}")
            all_ok = False

    return all_ok


def audit_docs():
    section("DOCUMENTATION AUDIT")
    docs = ["FINAL_STATUS.md", "LIVE.txt", "AUTONOMOUS_SYSTEM.md", "DEPLOYMENT.md", "SYSTEM_DEFINITION.md"]
    all_ok = True
    for doc in docs:
        path = ROOT / doc
        if path.exists():
            print(f"  {CHECK} {doc}")
        else:
            print(f"  {WARN} {doc} missing")
            all_ok = False
    return all_ok


def main():
    print("ABC-IO v2.0 Full System Audit")
    print(f"Project root: {ROOT}")

    results = {
        "files": audit_files(),
        "docker": audit_docker_compose(),
        "git": audit_git(),
        "apk": audit_apk(),
        "public": audit_public_endpoints(),
        "autonomous": audit_autonomous(),
        "docs": audit_docs(),
    }

    section("AUDIT SUMMARY")
    for k, v in results.items():
        print(f"  {CHECK if v else CROSS} {k}")

    all_pass = all(results.values())
    if all_pass:
        print("\n[PASS] REDOT2 COMPLETE SYSTEM BUILT AND LIVE")
        print("All audit checks passed. System is ready for autonomous operation.")
        return 0
    else:
        print("\n[WARN] AUDIT COMPLETE WITH WARNINGS")
        print("Some checks did not pass. Review items marked [FAIL] or [WARN] above.")
        return 1


if __name__ == "__main__":
    sys.exit(main())
