# ABC-IO v2.0 Production Audit Checklist

Run this audit sequentially across local, VPS nodes, and public endpoints to verify full system readiness.

---

## Module 1: Codebase & Git Architecture

- [ ] Repository structure validates (`services/`, `scripts/`, `config/`, `docs/`)
- [ ] `.env` is in `.gitignore` — no secrets committed
- [ ] `.env.example` contains all required placeholders
- [ ] Docker Compose files validate (`docker compose config` passes)
- [ ] CI/CD workflows present in `.github/workflows/`

## Module 2: 5x5c25 Data Matrix Engine

- [ ] POST `/api/v1/matrix/process` rejects invalid 4x4 matrix (400)
- [ ] POST `/api/v1/matrix/process` accepts valid 5x5 text matrix
- [ ] POST `/api/v1/matrix/process` returns sensory stream for non-text targets
- [ ] AI-ISP health responds at `/health`

## Module 3: Location Awareness Beacon

- [ ] POST `/api/v1/beacon/emit` registers beacon
- [ ] GET `/api/v1/beacon/active` returns beacons within radius
- [ ] Responder acknowledgment works at `/api/v1/beacon/acknowledge`
- [ ] Family-safe filtering is enforced

## Module 4: Billing & Payments

- [ ] Stripe checkout session creates successfully
- [ ] Webhook `/api/v1/billing/webhook` receives and processes events
- [ ] PayPal skeleton routes respond (`/api/v1/billing/paypal/create-order`)
- [ ] 10-tier pricing page displays on public portal
- [ ] Account tier updates correctly after payment

## Module 5: Admin Dashboard & Self-Healing

- [ ] `/api/v1/admin/metrics` returns uptime, memory, queue length
- [ ] `/api/v1/admin/escalate` routes to human queue during 8AM-8PM EST
- [ ] `/api/v1/admin/escalate` routes to autonomous mitigation outside hours
- [ ] `/api/v1/admin/self-heal` triggers on CRITICAL_500_FAIL_DETECTION
- [ ] Operator Station LED dashboard shows all 17 services
- [ ] Owner dashboard can restart/stop/start services

## Module 6: Distributed Infrastructure

- [ ] redot1 (gateway) health responds at `:4000/health`
- [ ] ai1 (primary AI) kimii responds at `:5000/health`
- [ ] ai2 (standby AI) kimi responds at `:5000/health`
- [ ] Headscale VPN mesh is operational
- [ ] Nginx reverse proxy routes to gateway and public portal
- [ ] SSL certificates are active (if certbot completed)
- [ ] Firewall allows only 22, 80, 443 externally

## Module 7: Security & Compliance

- [ ] No secrets in source code
- [ ] Pre-commit hook blocks credential patterns
- [ ] JWT tokens expire after 7 days
- [ ] Rate limiting enforced per tier
- [ ] API keys use SHA-256 hashes with prefixes
- [ ] Branch protection active on `master`

---

**Sign-off:** _________________ Date: _________________
