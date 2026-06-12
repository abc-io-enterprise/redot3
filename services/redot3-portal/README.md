# ABC-IO — Universal Silicone & Carbon Cross-Sensory Platform

**Global Sensory Interface Communications Provider and AI Software ISP System**

by Christopher Porreca / redot1

---

## Overview

ABC-IO is the world's first comprehensive cross-sensory information sharing communications platform. Built on silicone and carbon sensor technology, it enables communication across six distinct human sensory modalities: touch, audio, visual, haptic, scent, and taste.

### Key Features

- **Cross-Sensory Interface** — Real-time translation across 6 modalities
- **AI Operations** — Dual-provider AI with circuit breaker and retry logic
- **Global Mesh Network** — Encrypted VPN across 3 continent-spanning nodes
- **Cellular Backup Gateway** — Emergency mesh via Android app
- **Enterprise Security** — HMAC-SHA256, biometric tokens, full audit logging
- **24/7 Infrastructure** — 3-node cluster with continuous monitoring

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + TypeScript + Vite |
| Styling | Tailwind CSS 3.4 + shadcn/ui |
| Routing | React Router DOM |
| Charts | Recharts |
| Icons | Lucide React |
| State | React Hooks |

## Project Structure

```
abc-io-redot3/
├── public/
│   └── images/           # Generated visual assets
├── src/
│   ├── components/       # Layout, Navigation, Footer
│   ├── pages/           # 20+ page components
│   ├── hooks/           # Custom React hooks
│   ├── lib/             # Utility functions
│   ├── App.tsx          # Main router
│   ├── index.css        # Global styles
│   └── main.tsx         # Entry point
├── docs/                # Documentation
├── index.html
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

## Pages

| Page | Route | Description |
|------|-------|-------------|
| Home | `/` | Hero, features, infrastructure, pricing |
| Features | `/features` | Cross-sensory, AI, mesh, security details |
| Pricing | `/pricing` | 5 tiers + 5 deployment environments |
| Solutions | `/solutions` | 5x5c25 interfacing system |
| Community | `/community` | Stats, discussions, events |
| Help | `/help` | Searchable help center |
| Docs | `/docs` | Full API documentation |
| Learn | `/learn` | eLibrary with articles |
| Onboarding | `/onboarding` | 24-month curriculum |
| Dashboard | `/dashboard` | User dashboard with tabs |
| Account | `/account` | Login page |
| Interface | `/interface` | AI chat interface |
| Mobile App | `/mobile-app` | PWA information |
| Beacon | `/beacon` | Free public awareness beacon |
| Privacy | `/privacy` | Privacy policy |
| Terms | `/terms` | Terms of service |
| Customer Area | `/customer-area` | Support tickets |
| Sensory Communications | `/sensory-communications` | Provider details |
| Sign Up | `/signup` | Account creation |
| Login | `/login` | User login |

## Infrastructure

| Node | Role | Location | IP | Status |
|------|------|----------|-----|--------|
| redot1 | Primary | US East | 162.254.32.142 | Operational |
| ai1 | AI Worker | US Central | 192.227.212.235 | Operational |
| ai2 | AI Standby | US Central | 192.227.212.237 | Operational |

## Deployment Environments

1. **Dev** — Local live-reload environment
2. **Staging** — Pre-production validation
3. **Production** — Primary full-stack deployment
4. **Replica AI-1** — Redundant public-facing node
5. **Replica AI-2** — Secondary redundant node

## Pricing Tiers

| Tier | Price | Requests/Min | Key Features |
|------|-------|-------------|--------------|
| Free | $0 | 30 | Community support, basic AI |
| Basic | $9 | 60 | Email support, API access |
| Standard | $19 | 120 | API keys, webhooks |
| Pro | $29 | 300 | Team workspaces, analytics |
| Business | $49 | 600 | Dedicated support, SSO |

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Contact

- **Website**: https://abc-io.com
- **Email**: contact@abc-io.com
- **Phone**: 585-348-7120
- **Author**: Christopher Porreca / redot1

## License

&copy; 2026 ABC-IO by Christopher Porreca / redot1. All rights reserved.
