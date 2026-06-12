#!/usr/bin/env python3
"""Rotate internal ABC-IO secrets in .env. External API keys (Stripe, PayPal, AI, SMTP) are left unchanged and must be rotated manually."""
import os
import re
import secrets
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ENV_PATH = ROOT / ".env"

if not ENV_PATH.exists():
    print("[ERROR] .env not found")
    raise SystemExit(1)


def random_hex(n):
    return secrets.token_hex(n)


def fingerprint_from_key(key):
    return "fp-" + secrets.token_hex(8)


# Read current env
content = ENV_PATH.read_text(encoding="utf-8")

# Generate new internal secrets
new_owner_key = random_hex(32)
new_owner_fp = fingerprint_from_key(new_owner_key)
new_owner_session = "ost-" + random_hex(32)
new_owner_biometric = random_hex(32)
new_mobile_key = random_hex(32)
new_mobile_fp = fingerprint_from_key(new_mobile_key)
new_public_key = random_hex(32)
new_public_fp = fingerprint_from_key(new_public_key)
new_jwt_secret = random_hex(32)
new_gateway_api_key = "gak-" + random_hex(24)
new_self_heal_token = "sht-" + random_hex(24)
new_redot1_api_key = "r1k-" + random_hex(24)
new_postgres_password = secrets.token_urlsafe(24)

replacements = {
    r"OWNER_SIGNING_KEY=.*": f"OWNER_SIGNING_KEY={new_owner_key}",
    r"OWNER_SIGNING_FINGERPRINT=.*": f"OWNER_SIGNING_FINGERPRINT={new_owner_fp}",
    r"OWNER_SESSION_TOKEN=.*": f"OWNER_SESSION_TOKEN={new_owner_session}",
    r"OWNER_BIOMETRIC_SECRET=.*": f"OWNER_BIOMETRIC_SECRET={new_owner_biometric}",
    r"MOBILE_SIGNING_KEY=.*": f"MOBILE_SIGNING_KEY={new_mobile_key}",
    r"MOBILE_SIGNING_FINGERPRINT=.*": f"MOBILE_SIGNING_FINGERPRINT={new_mobile_fp}",
    r"PUBLIC_SIGNING_KEY=.*": f"PUBLIC_SIGNING_KEY={new_public_key}",
    r"PUBLIC_SIGNING_FINGERPRINT=.*": f"PUBLIC_SIGNING_FINGERPRINT={new_public_fp}",
    r"JWT_SECRET=.*": f"JWT_SECRET={new_jwt_secret}",
    r"GATEWAY_API_KEY=.*": f"GATEWAY_API_KEY={new_gateway_api_key}",
    r"SELF_HEAL_TOKEN=.*": f"SELF_HEAL_TOKEN={new_self_heal_token}",
    r"REDOT1_API_KEY=.*": f"REDOT1_API_KEY={new_redot1_api_key}",
    r"POSTGRES_PASSWORD=.*": f"POSTGRES_PASSWORD={new_postgres_password}",
}

for pattern, replacement in replacements.items():
    content = re.sub(pattern, replacement, content, flags=re.MULTILINE)

# Ensure new vars added by v5.0.0 exist
if "KIMI_ENDPOINTS=" not in content:
    content += "\nKIMI_ENDPOINTS=http://kimi:5000,http://192.227.212.235:5000,http://192.227.212.237:5000\n"
if "PRIMARY_HOST=" not in content:
    content += "\nPRIMARY_HOST=162.254.32.142\nAI1_HOST=192.227.212.235\nAI2_HOST=192.227.212.237\n"
if "VPS_REDOT1_PASSWORD=" not in content:
    content += "\n# SSH passwords for deployment\nVPS_REDOT1_PASSWORD=\nVPS_AI1_PASSWORD=\nVPS_AI2_PASSWORD=\n"

ENV_PATH.write_text(content, encoding="utf-8")
print("[OK] Internal secrets rotated in .env")
print("[NOTE] The following external secrets were NOT rotated and should be updated manually:")
print("  - MISTRAL_API_KEY / KIMI_API_KEY")
print("  - STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET / STRIPE_PRICE_ID_*")
print("  - PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET / PAYPAL_WEBHOOK_ID")
print("  - SMTP_URL / SMTP_HOST / SMTP_USER / SMTP_PASS")
print("  - HEADSCALE_API_KEY")
print("  - GITEA_SECRET_KEY / GITEA_INTERNAL_TOKEN / GITEA_DB_PASSWORD")
