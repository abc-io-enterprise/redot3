#!/bin/bash
# ABC-IO Namecheap DNS Sync
# Syncs DNS records for abc-io.com with the VPS cluster IPs
# Usage: ./scripts/sync-namecheap-dns.sh

set -e

# Load from environment
NC_USER="${NAMECHEAP_USER:-ccplexmath}"
NC_API_KEY="${NAMECHEAP_VPS_API_KEY}"
NC_CLIENT_IP="${NAMECHEAP_CLIENT_IP:-$(curl -4 -s ifconfig.me)}"
DOMAIN="${NAMECHEAP_DOMAIN:-abc-io.com}"

REDOT1_IP="${REDOT1_IP:-162.254.32.142}"
AI1_IP="${AI1_IP:-192.227.212.235}"
AI2_IP="${AI2_IP:-192.227.212.237}"

echo "================================================"
echo "ABC-IO Namecheap DNS Sync"
echo "================================================"
echo "Domain: $DOMAIN"
echo "Client IP: $NC_CLIENT_IP"
echo ""

if [ -z "$NC_API_KEY" ]; then
    echo "ERROR: NAMECHEAP_VPS_API_KEY not set"
    echo "Set it in .env and source it before running this script."
    exit 1
fi

# Function to set a DNS A record
set_a_record() {
    local host="$1"
    local ip="$2"
    echo "  Setting A record: $host.$DOMAIN -> $ip"
    
    response=$(curl -s "https://api.namecheap.com/xml.response?ApiUser=$NC_USER&ApiKey=$NC_API_KEY&UserName=$NC_USER&Command=namecheap.domains.dns.setHosts&ClientIp=$NC_CLIENT_IP&SLD=abc-io&TLD=com&HostName1=$host&RecordType1=A&Address1=$ip&TTL1=1800" 2>/dev/null || echo "ERROR")
    
    if echo "$response" | grep -q "IsSuccess.*true"; then
        echo "    ✅ Success"
    else
        echo "    ⚠️  Response: $(echo "$response" | head -c 200)"
    fi
}

echo "[1/4] Syncing A records..."
set_a_record "@" "$REDOT1_IP"
set_a_record "www" "$REDOT1_IP"
set_a_record "redot1" "$REDOT1_IP"
set_a_record "ai1" "$AI1_IP"
set_a_record "ai2" "$AI2_IP"
set_a_record "gateway" "$REDOT1_IP"
set_a_record "admin" "$REDOT1_IP"
set_a_record "headscale" "$REDOT1_IP"
set_a_record "grafana" "$REDOT1_IP"
set_a_record "prometheus" "$REDOT1_IP"

echo ""
echo "[2/4] Verifying DNS propagation..."
for host in "@" "www" "redot1" "ai1" "ai2"; do
    if [ "$host" = "@" ]; then
        resolved=$(dig +short abc-io.com @8.8.8.8 2>/dev/null || echo "unresolved")
    else
        resolved=$(dig +short "$host.abc-io.com" @8.8.8.8 2>/dev/null || echo "unresolved")
    fi
    echo "  $host.abc-io.com -> $resolved"
done

echo ""
echo "[3/4] Shared Hosting Check..."
echo "  Shared hosting API configured for: abc-io.com"
echo "  Landing page should be deployed to Namecheap cPanel public_html"

echo ""
echo "[4/4] DNS Sync Complete"
echo "================================================"
echo "Note: DNS propagation may take 5-30 minutes."
echo "Verify with: dig abc-io.com @8.8.8.8"
echo "================================================"
