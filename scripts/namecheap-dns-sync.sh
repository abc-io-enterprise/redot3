#!/bin/bash
# ABC-IO Namecheap DNS Synchronization
# Uses Namecheap API to manage DNS records for abc-io.com

set -e

API_USER="${NAMECHEAP_USER:-cporreca}"
API_KEY="${NAMECHEAP_SHARED_HOSTING_API_KEY:-}"
CLIENT_IP="${NAMECHEAP_CLIENT_IP:-$(curl -s https://api.ipify.org)}"
DOMAIN="abc-io.com"
SLD="abc-io"
TLD="com"

if [ -z "$API_KEY" ]; then
    echo "ERROR: NAMECHEAP_SHARED_HOSTING_API_KEY not set."
    echo "Set it in .env or export NAMECHEAP_SHARED_HOSTING_API_KEY=your_key"
    exit 1
fi

API_URL="https://api.namecheap.com/xml.response"

echo "================================================"
echo "ABC-IO Namecheap DNS Sync"
echo "================================================"
echo "Domain: $DOMAIN"
echo "Client IP: $CLIENT_IP"
echo "================================================"

# Get current DNS hosts
get_hosts() {
    echo "[DNS] Fetching current hosts..."
    curl -s "$API_URL?ApiUser=$API_USER&ApiKey=$API_KEY&UserName=$API_USER&Command=namecheap.domains.dns.getHosts&ClientIp=$CLIENT_IP&SLD=$SLD&TLD=$TLD"
}

# Set DNS hosts (A records for redot1, ai1, ai2)
set_hosts() {
    echo "[DNS] Setting A records..."
    curl -s "$API_URL" \
        -d "ApiUser=$API_USER" \
        -d "ApiKey=$API_KEY" \
        -d "UserName=$API_USER" \
        -d "Command=namecheap.domains.dns.setHosts" \
        -d "ClientIp=$CLIENT_IP" \
        -d "SLD=$SLD" \
        -d "TLD=$TLD" \
        -d "HostName1=@" \
        -d "RecordType1=A" \
        -d "Address1=${REDOT1_IP:-162.254.32.142}" \
        -d "TTL1=1800" \
        -d "HostName2=redot1" \
        -d "RecordType2=A" \
        -d "Address2=${REDOT1_IP:-162.254.32.142}" \
        -d "TTL2=1800" \
        -d "HostName3=ai1" \
        -d "RecordType3=A" \
        -d "Address3=${AI1_IP:-192.227.212.235}" \
        -d "TTL3=1800" \
        -d "HostName4=ai2" \
        -d "RecordType4=A" \
        -d "Address4=${AI2_IP:-192.227.212.237}" \
        -d "TTL4=1800" \
        -d "HostName5=headscale" \
        -d "RecordType5=A" \
        -d "Address5=${REDOT1_IP:-162.254.32.142}" \
        -d "TTL5=1800" \
        -d "HostName6=www" \
        -d "RecordType6=CNAME" \
        -d "Address6=abc-io.com" \
        -d "TTL6=1800"
}

# Get domain list
check_domains() {
    echo "[DOMAINS] Listing domains..."
    curl -s "$API_URL?ApiUser=$API_USER&ApiKey=$API_KEY&UserName=$API_USER&Command=namecheap.domains.getList&ClientIp=$CLIENT_IP"
}

case "${1:-sync}" in
    sync)
        set_hosts
        echo "[DNS] Sync complete."
        ;;
    get)
        get_hosts
        ;;
    domains)
        check_domains
        ;;
    *)
        echo "Usage: $0 {sync|get|domains}"
        exit 1
        ;;
esac
