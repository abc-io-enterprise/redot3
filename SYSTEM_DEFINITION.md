# redot1 — System Definition

**Owner:** Christopher Porreca  
**Company:** redot1  
**Created:** 2026  
**Domain:** https://abc-io.com  
**Repository:** https://github.com/abc-io-enterprise/redot2  
**Contact:** cporreca@abc-io.com | 585-629-9120

---

## What is redot1?

**redot1** is a Global Interfacing and Communications Provider created in 2026 by Christopher Porreca. It is a personal communications provider powered by an AI-autonomous ISP backend system for private and business use.

At its core, redot1 operates **ABC-IO** (`abc-io.com`), a cloud web operating system that delivers:

- **Global sensory interfacing** — text, braille, morse, haptic, audio, speech, and gesture translation via the 5×5c25 cross-sensory matrix.
- **AI Software ISP** — multi-modal LLM API and inference routing across private VPS and AI worker nodes.
- **Digital Self Account Security** — JWT/API-key auth, RBAC, HMAC signing, audit logs, and family-safe filtering.
- **Human Interaction Portal** — community hub, help center, chat rooms, and intervention queue.
- **Free Beacon Service** — locationally aware, privacy-first public safety beacon PWA with weather, alerts, and nearby events.
- **Customer & Family Dashboards** — usage controls, accessibility settings, billing, and safety filters.
- **Autonomous Operations** — self-healing orchestrator, desktop admin backend, and owner-only biometric APK for cellular failover.

---

## Mission

To make life interactive.

redot1 provides always-on, accessible, and autonomous communication infrastructure for individuals, families, private groups, public services, organizations, and businesses. Every user — regardless of sensory ability — can interface with the system through their preferred modality.

---

## Architecture

### Primary Node (redot1)
- **Host:** 162.254.32.142
- **Location:** Public VPS
- **Role:** Full 19-service Docker Compose stack
- **Services:** nginx, gateway, operator-station, owner-dashboard, mobile-gateway, public-portal, beacon-pwa, beacon, kimi, ai-isp, worker, postgres, redis, prometheus, grafana, tracer, headscale, logger, autonomous

### AI Worker Nodes
- **ai1:** 192.227.212.235
- **ai2:** 192.227.212.237
- **Role:** AI inference and background job processing

### Domain & Security
- **Domain:** abc-io.com
- **SSL:** Let's Encrypt (valid through 2026-09-09)
- **DNS:** Namecheap (manual/Google Cloud migration ready)
- **VPN:** Headscale self-hosted WireGuard control server

### Failsafe
- **Owner APK:** Biometric-locked Android app with hardcoded backend endpoints, serving as cellular failover gateway.
- **Desktop Orchestrator:** Offline-capable admin center that monitors public infrastructure and triggers self-heal.

---

## Account Types

| Type | Use Case |
|------|----------|
| Personal | Individuals and families |
| Private | Closed groups and teams |
| Public | Public services and open communities |
| Service | API-driven integrations |
| Organization | Nonprofits and NGOs |
| Business | Companies and enterprises |

---

## Key Differentiators

1. **5×5c25 Universal Interfacing** — cross-sensory translation between vision, hearing, touch, speech, and gesture.
2. **Autonomous Backend** — self-monitoring, self-healing, cellular-failsafe control plane.
3. **Privacy-First Beacon** — free public safety tool that collects no PII.
4. **Family-Safe by Design** — content filtering, usage controls, and accessibility settings.
5. **Owner-Controlled Infrastructure** — private VPS, GitHub Enterprise, and owner-only mobile failsafe.

---

## Status

**REDOT2 COMPLETE SYSTEM BUILT AND LIVE**

The system is deployed, verified, and ready for public use. Desktop may disconnect; public VPS runs autonomously.

---

*redot1 — A Personal Communications Provider by Christopher Porreca.*
