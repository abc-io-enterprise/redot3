#!/bin/bash
# ABC-IO Cloud Deployment Verification
# Usage: ./scripts/verify-cloud-deployment.sh [redot1_ip] [ai1_ip] [ai2_ip]
# Tests all public endpoints to confirm cloud-independent operation.

set -e

REDOT1_IP="${1:-162.254.32.142}"
AI1_IP="${2:-192.227.212.235}"
AI2_IP="${3:-192.227.212.237}"

PASS=0
FAIL=0

check() {
    local name="$1"
    local url="$2"
    local expected_code="${3:-200}"
    echo -n "  [$name] $url ... "
    if code=$(curl -sf -o /dev/null -w "%{http_code}" --max-time 10 "$url" 2>/dev/null); then
        if [ "$code" = "$expected_code" ]; then
            echo "✅ PASS ($code)"
            PASS=$((PASS + 1))
        else
            echo "⚠️  UNEXPECTED ($code, expected $expected_code)"
            FAIL=$((FAIL + 1))
        fi
    else
        echo "❌ FAIL (unreachable)"
        FAIL=$((FAIL + 1))
    fi
}

echo "================================================"
echo "ABC-IO v2.0 — Cloud Deployment Verification"
echo "================================================"
echo "Nodes:"
echo "  redot1 (Gateway):  $REDOT1_IP"
echo "  ai1   (Primary AI): $AI1_IP"
echo "  ai2   (Standby AI): $AI2_IP"
echo "================================================"

echo ""
echo "[1/6] REDOT1 — Full Stack Services"
check "Gateway Health" "http://$REDOT1_IP:4000/health"
check "Operator Station" "http://$REDOT1_IP:8080/health"
check "Owner Dashboard" "http://$REDOT1_IP:8500/health"
check "Public Portal" "http://$REDOT1_IP:8090/health"
check "Mobile Gateway" "http://$REDOT1_IP:5050/health"
check "Beacon PWA" "http://$REDOT1_IP:3005/" 200
check "Prometheus" "http://$REDOT1_IP:9091/-/healthy" 200
check "Grafana" "http://$REDOT1_IP:14000/api/health" 200
check "Headscale" "http://$REDOT1_IP:8085/health" 200

echo ""
echo "[2/6] AI1 — AI Worker"
check "AI Health" "http://$AI1_IP:5000/health"

echo ""
echo "[3/6] AI2 — AI Standby"
check "AI Health" "http://$AI2_IP:5000/health"

echo ""
echo "[4/6] AI Provider — Mistral API"
echo -n "  [Mistral API Key] ... "
if [ -n "${MISTRAL_API_KEY}" ]; then
    echo "✅ CONFIGURED"
    PASS=$((PASS + 1))
else
    echo "❌ MISSING (set MISTRAL_API_KEY env var)"
    FAIL=$((FAIL + 1))
fi

echo ""
echo "[5/6] GitHub Backup"
echo -n "  [Remote Origin] ... "
if git ls-remote origin HEAD >/dev/null 2>&1; then
    echo "✅ REACHABLE"
    PASS=$((PASS + 1))
else
    echo "❌ UNREACHABLE"
    FAIL=$((FAIL + 1))
fi

echo -n "  [Recent Commits] ... "
commit_count=$(git rev-list --count HEAD 2>/dev/null || echo 0)
if [ "$commit_count" -gt 0 ]; then
    echo "✅ $commit_count commits"
    PASS=$((PASS + 1))
else
    echo "❌ No commits"
    FAIL=$((FAIL + 1))
fi

echo ""
echo "[6/6] Android APK"
echo -n "  [APK File] ... "
if [ -f "apk/redot2-operator.apk" ]; then
    size=$(stat -c%s "apk/redot2-operator.apk" 2>/dev/null || stat -f%z "apk/redot2-operator.apk" 2>/dev/null)
    echo "✅ EXISTS ($size bytes)"
    PASS=$((PASS + 1))
else
    echo "❌ NOT FOUND"
    FAIL=$((FAIL + 1))
fi

echo ""
echo "================================================"
echo "VERIFICATION COMPLETE"
echo "  ✅ Passed: $PASS"
echo "  ❌ Failed: $FAIL"
echo "================================================"

if [ "$FAIL" -eq 0 ]; then
    echo ""
    echo "🎉 ALL CHECKS PASSED"
    echo "The system is fully operational in the cloud."
    echo "The local desktop can be safely shut down."
    echo "================================================"
    exit 0
else
    echo ""
    echo "⚠️  $FAIL CHECK(S) FAILED"
    echo "Resolve failures before shutting down the local desktop."
    echo "================================================"
    exit 1
fi
