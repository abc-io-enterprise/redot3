# ABC-IO Architecture Documentation

## System Overview

ABC-IO is built as a modern single-page application (SPA) using React with client-side routing. The architecture follows a component-based design with clear separation of concerns.

## Frontend Architecture

### Component Hierarchy

```
App (BrowserRouter)
└── Layout
    ├── Navigation (sticky, responsive)
    ├── Outlet (page content)
    └── Footer
```

### Page Architecture

All pages follow a consistent structure:
- **Hero Section** — Title, badge, description
- **Content Sections** — Cards, grids, feature lists
- **CTA Section** — Call-to-action for conversion

### State Management

- Local component state via `useState`
- No external state library needed for this scope
- URL-based navigation via React Router

### Styling Architecture

- Tailwind CSS utility classes
- Custom CSS variables for theming
- Dark theme as default
- Glass morphism effects via `backdrop-blur`
- Custom animations (fadeIn, slideIn, pulse, float)

## Design System

### Colors

| Token | Value | Usage |
|-------|-------|-------|
| Primary | Cyan (#06b6d4) | CTAs, links, accents |
| Accent | Purple (#a855f7) | Gradients, highlights |
| Background | Dark (#0a0e1a) | Page background |
| Card | Slightly lighter | Card backgrounds |
| Border | White 10% opacity | Dividers, card borders |

### Typography

- Font: System sans-serif stack
- Hero: 4xl-5xl bold
- Section titles: 2xl-3xl bold
- Body: sm base with relaxed leading
- Code: Monospace

### Spacing

- Max content width: 1280px (max-w-7xl)
- Section padding: py-16 to py-20
- Card padding: p-4 to p-6
- Grid gaps: gap-4 to gap-6

## API Design

### Authentication

- JWT Bearer tokens for session auth
- API keys for service-to-service
- HMAC-SHA256 request signing

### Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | /auth/register | User registration |
| POST | /auth/login | User authentication |
| GET | /auth/me | Current user |
| POST | /ai/generate | AI content generation |
| GET | /ai/health | AI service health |
| POST | /translate/:modality | Cross-sensory translation |
| GET | /translate/modalities | List modalities |

### Translation Modalities

- speech-to-text
- text-to-braille
- text-to-morse
- text-to-haptic
- sign-to-text
- universal

## Infrastructure Design

### 3-Node Cluster

```
redot1 (Primary)
├── US East
├── 162.254.32.142
├── Full Stack
└── NGINX + SSL + Monitoring

ai1 (AI Worker)
├── US Central
├── 192.227.212.235
├── AI Primary
└── Gateway + Portal + Kimi

ai2 (AI Standby)
├── US Central
├── 192.227.212.237
├── AI Backup
└── Gateway + Portal + Kimi
```

### Failover Strategy

- ai1 serves as primary AI worker
- ai2 as automatic failover target
- Sub-second failover detection
- NGINX upstream/load balancing

## Security Architecture

### Authentication Layers

1. **Password**: bcrypt hashed
2. **JWT**: Signed tokens with expiry
3. **API Keys**: HMAC-SHA256 signed requests
4. **Biometric**: Hardware-backed tokens

### Data Protection

- TLS 1.3 for all API traffic
- AES-256-GCM for mesh VPN
- No hardcoded secrets (runtime injection)
- Full audit logging with tamper evidence

## The 5x5c25 Interfacing System

Five solution families × five service tiers = 25 capability modules:

| Family | Modules |
|--------|---------|
| AI ISP | Text-to-Braille, Text-to-Morse, Haptic Feedback, Speech-to-Text, Sign Language |
| Communications | Secure Messaging, Chat Rooms, API Access, Rate-Limited Gateways, Team Workspaces |
| Creativity | Safe AI Generation, Creative Dashboards, Content Filters, Family Safety, Creative Tools |
| Safety | Security Monitoring, Anomaly Detection, Audit Logs, Digital Self-Help, Threat Response |
| Cloud OS | Triple-Node Redundancy, Cellular Backup, Monitoring Stack, Auto-Heal, Owner Governance |

## Performance Considerations

- Lazy loading for heavy components
- Image optimization via Vite
- Code splitting by route
- CSS purging via Tailwind
- Animation performance with GPU acceleration
