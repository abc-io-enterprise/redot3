#!/usr/bin/env python3
"""Generate the ABC-IO v5.0.0 Owner Reference PDF."""
import os
import sys
import base64
from datetime import datetime
from xhtml2pdf import pisa

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LOGO_PATH = os.path.join(ROOT, "services", "public-portal", "src", "public", "abc-io_logo_new.png")
OUT_PATH = os.path.join(ROOT, "ABC-IO_v5.0.0_Owner_Reference.pdf")


def b64_image(path):
    if not os.path.exists(path):
        return ""
    with open(path, "rb") as f:
        data = f.read()
    return f"data:image/png;base64,{base64.b64encode(data).decode()}"


def generate():
    logo = b64_image(LOGO_PATH)
    now = datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")
    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>ABC-IO v5.0.0 Owner Reference</title>
<style>
  @page {{ size: letter; margin: 0.75in; }}
  body {{ font-family: "Helvetica", "Arial", sans-serif; color: #222; line-height: 1.5; }}
  h1 {{ color: #0a0a2e; font-size: 28px; margin-bottom: 6px; }}
  h2 {{ color: #0a0a2e; font-size: 18px; border-bottom: 2px solid #00ff88; padding-bottom: 4px; margin-top: 24px; }}
  h3 {{ color: #0a0a2e; font-size: 14px; margin-top: 18px; }}
  .subtitle {{ color: #555; font-size: 14px; margin-bottom: 18px; }}
  .logo {{ text-align: center; margin-bottom: 12px; }}
  .logo img {{ max-height: 80px; }}
  table {{ width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 12px; }}
  th, td {{ border: 1px solid #ccc; padding: 6px; text-align: left; vertical-align: top; }}
  th {{ background: #0a0a2e; color: #fff; }}
  tr:nth-child(even) {{ background: #f8f8f8; }}
  code {{ background: #f0f0f0; padding: 2px 4px; border-radius: 3px; font-family: monospace; }}
  .note {{ background: #f0fff4; border-left: 4px solid #00ff88; padding: 10px; margin: 12px 0; }}
  .warning {{ background: #fff7ed; border-left: 4px solid #f97316; padding: 10px; margin: 12px 0; }}
  ul {{ margin-top: 4px; }}
  li {{ margin-bottom: 4px; }}
  .footer {{ margin-top: 30px; font-size: 10px; color: #777; text-align: center; border-top: 1px solid #ddd; padding-top: 8px; }}
</style>
</head>
<body>
<div class="logo"><img src="{logo}" alt="ABC-IO Logo"></div>
<h1 style="text-align:center">ABC-IO v5.0.0 — Owner Reference</h1>
<div class="subtitle" style="text-align:center">redot1 Cloud Operating System<br>Generated: {now}</div>

<h2>1. Release Summary</h2>
<p>ABC-IO v5.0.0 (codename <strong>redot1</strong>) is the fully-deployed public cloud operating system. This release consolidates the public portal, owner dashboard, mobile gateway, beacon PWA, AI services, and autonomous orchestration into a single managed stack running on <code>162.254.32.142</code>.</p>

<div class="note">
<strong>Primary domain:</strong> <code>https://abc-io.com</code><br>
<strong>VPS host:</strong> <code>redot1 / 162.254.32.142</code><br>
<strong>Tag:</strong> <code>v5.0.0</code> in <code>abc-io-enterprise/redot2</code>
</div>

<h2>2. Live Endpoints</h2>
<table>
<tr><th>Service</th><th>URL</th><th>Purpose</th></tr>
<tr><td>Public Portal</td><td><code>https://abc-io.com/</code></td><td>Marketing, pricing, signup, docs</td></tr>
<tr><td>Customer Dashboard</td><td><code>https://abc-io.com/dashboard.html</code></td><td>Subscriptions, invoices, API keys, usage</td></tr>
<tr><td>Beacon PWA</td><td><code>https://abc-io.com/beacon/</code></td><td>Anonymous, privacy-first safety beacon</td></tr>
<tr><td>Mobile Gateway</td><td><code>http://162.254.32.142:5050</code></td><td>Cellular/autonomous backup gateway</td></tr>
<tr><td>Owner Dashboard</td><td><code>http://162.254.32.142:8500</code></td><td>Privileged owner operations, APK download</td></tr>
<tr><td>Operator Station</td><td><code>http://162.254.32.142:8080</code></td><td>Operational health/status dashboard</td></tr>
<tr><td>Gateway Health</td><td><code>https://abc-io.com/api/v1/system/health</code></td><td>Public health check</td></tr>
<tr><td>Prometheus</td><td><code>http://162.254.32.142:9091</code></td><td>Metrics</td></tr>
<tr><td>Grafana</td><td><code>http://162.254.32.142:14000</code></td><td>Visualization</td></tr>
<tr><td>Jaeger</td><td><code>http://162.254.32.142:16686</code></td><td>Distributed tracing</td></tr>
</table>

<h2>3. Public Pricing Tiers</h2>
<table>
<tr><th>Tier</th><th>Monthly</th><th>Annual</th><th>Rate Limit</th><th>Best For</th></tr>
<tr><td>Free</td><td>$0</td><td>$0</td><td>30 req/min</td><td>Experimentation, beacon</td></tr>
<tr><td>Basic</td><td>$9</td><td>$90</td><td>60 req/min</td><td>Personal projects</td></tr>
<tr><td>Standard</td><td>$19</td><td>$190</td><td>120 req/min</td><td>Freelancers</td></tr>
<tr><td>Pro</td><td>$29</td><td>$290</td><td>300 req/min</td><td>Professionals</td></tr>
<tr><td>Business</td><td>$49</td><td>$490</td><td>600 req/min</td><td>Small business</td></tr>
<tr><td>Team</td><td>$99</td><td>$990</td><td>1,200 req/min</td><td>Growing teams</td></tr>
<tr><td>Corporate</td><td>$199</td><td>$1,990</td><td>2,000 req/min</td><td>Departments</td></tr>
<tr><td>Enterprise</td><td>$299</td><td>$2,990</td><td>3,000 req/min</td><td>Large orgs</td></tr>
<tr><td>Agency</td><td>$499</td><td>$4,990</td><td>5,000 req/min</td><td>Multi-tenant agencies</td></tr>
<tr><td>Global</td><td>$999</td><td>$9,990</td><td>10,000 req/min</td><td>Worldwide scale</td></tr>
</table>

<h2>4. Signup & Upgrade Flow</h2>
<ol>
<li>User selects a tier on <code>/pricing.html</code>.</li>
<li>Clicking a CTA navigates to <code>/signup.html?tier=&lt;tier&gt;</code>.</li>
<li>Registration stores the requested tier on the account.</li>
<li>Free accounts go directly to the dashboard.</li>
<li>Paid accounts call <code>POST /api/v1/billing/checkout</code> (accepts <code>tier</code> or <code>priceId</code>) and are redirected to Stripe Checkout.</li>
<li>Existing subscribers can click <strong>Upgrade Plan</strong> in the dashboard to change tiers.</li>
</ol>

<h2>5. Beacon Privacy Policy</h2>
<div class="note">
The Beacon PWA is intentionally anonymous and privacy-first:
<ul>
<li>No account or PII is collected.</li>
<li>Location is accessed <strong>only</strong> when the user clicks <em>"What's Around Me?"</em>.</li>
<li>Beacons expire after 24 hours.</li>
<li>Users may emit emergency/SOS beacons without creating an account.</li>
</ul>
</div>

<h2>6. Owner-Only Operations</h2>
<p>The following capabilities are gated behind the authenticated Owner Dashboard and are intentionally absent from public pages:</p>
<ul>
<li>APK download (<code>/download/apk</code>)</li>
<li>Docker service lifecycle control (restart, pull, update)</li>
<li>User management and audit log review</li>
<li>Maintenance mode toggle</li>
<li>Backup status and cellular failover activation</li>
</ul>

<h2>7. AI Worker Topology</h2>
<table>
<tr><th>Node</th><th>IP</th><th>Role</th></tr>
<tr><td>redot1</td><td>162.254.32.142</td><td>Full-stack gateway + primary AI</td></tr>
<tr><td>ai1</td><td>192.227.212.235</td><td>Secondary AI worker</td></tr>
<tr><td>ai2</td><td>192.227.212.237</td><td>Secondary AI worker</td></tr>
</table>
<p>The mobile gateway monitors upstream nodes and can activate cellular/autonomous failover if the primary gateway fails.</p>

<h2>8. Deployment & Recovery</h2>
<ul>
<li>Primary deploy script: <code>scripts/deploy-staged-redot1.py</code></li>
<li>Cluster deploy script: <code>scripts/deploy-vps-cluster.sh</code></li>
<li>Emergency recovery: <code>scripts/emergency-recovery.sh</code></li>
<li>Health check: <code>scripts/health-check.sh</code></li>
<li>Auto-heal: <code>scripts/auto-heal.sh</code></li>
</ul>

<h2>9. Critical Security Notes</h2>
<div class="warning">
<strong>Secret rotation required.</strong> If any <code>.env</code> values were exposed, rotate immediately:
<ul>
<li>All <code>OWNER_*</code> keys and tokens</li>
<li><code>JWT_SECRET</code></li>
<li><code>POSTGRES_PASSWORD</code></li>
<li>Stripe and PayPal credentials</li>
<li>SMTP credentials</li>
<li>Mobile and public signing keys</li>
</ul>
After rotation, run <code>scripts/set-github-secrets.sh</code> and redeploy.
</div>

<h2>10. Deliverables</h2>
<ul>
<li>Source archive: <code>redot2-v5.final.zip</code></li>
<li>Full backup: <code>redot2-v5.0.0-final-backup.zip</code></li>
<li>Owner reference: <code>ABC-IO_v5.0.0_Owner_Reference.pdf</code> (this document)</li>
</ul>
<p>Before shutting down this workstation, copy all deliverables to encrypted USB/cloud storage and rotate all exposed secrets.</p>

<div class="footer">
ABC-IO v5.0.0 — redot1 Cloud Operating System — Owner Reference — Generated {now}<br>
This document is confidential and intended for the system owner.
</div>
</body>
</html>
"""
    with open(OUT_PATH, "wb") as out:
        result = pisa.CreatePDF(html, dest=out)
    if result.err:
        print(f"PDF generation errors: {result.err}")
        sys.exit(1)
    print(f"Generated {OUT_PATH}")


if __name__ == "__main__":
    generate()
