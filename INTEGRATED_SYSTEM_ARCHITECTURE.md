# ABC-IO v2.0 - Integrated System Architecture

## Vision: Single Unified Operator Control

**Owner**: cporreca@abc-io.com  
**Date**: 2026-06-10  
**Status**: DESIGN & IMPLEMENTATION

---

## System Components

```
┌─────────────────────────────────────────────────────────────┐
│         DESKTOP OPERATOR STATION (Windows/Docker)           │
│  - Owner Dashboard + Operator Console                        │
│  - System Control + Deployment Management                    │
│  - Health Monitoring + Auto-Healing Triggers                 │
│  - GitHub Repository Management                              │
│  - APK Distribution Control                                  │
└────────────────┬────────────────────────────────────────────┘
                 │ (Wifi/Cellular)
        ┌────────┼────────┐
        │        │        │
        ▼        ▼        ▼
    ┌────────┐ ┌──────┐ ┌─────────┐
    │ Mobile │ │ Cloud│ │ Backup  │
    │ APK    │ │ VPS  │ │ Cloud   │
    │(Phone) │ │(Live)│ │Storage  │
    └────────┘ └──────┘ └─────────┘
        │        │        │
        └────────┼────────┘
                 │
         ┌───────┴───────┐
         │               │
    ┌────────────┐  ┌──────────┐
    │ Namecheap  │  │ GitHub   │
    │ Domain     │  │Enterprise│
    │abc-io.com  │  │Repository│
    └────────────┘  └──────────┘
```

### Layer 1: DESKTOP CONTROL CENTER
- **Owner Dashboard**: Full operator console (http://localhost:8500)
- **Operator Station**: System monitoring (http://localhost:8080)
- **Local API**: REST endpoints for control and automation
- **Docker Compose**: 14 services for development/staging
- **Git Client**: Local repository management and push

### Layer 2: MOBILE BACKUP SYSTEM
- **Android APK**: Operator app on phone
  - Shows system status
  - Can trigger healing/restart
  - Receives notifications
  - Backup operator control when desktop offline
  - Beacon relay for emergency location
  - Cellular fallback access

### Layer 3: CLOUD DEPLOYMENT (PRODUCTION)
- **Namecheap Domain**: abc-io.com (DNS + domain management)
- **VPS Nodes**: 3 Ubuntu servers (redot1, ai1, ai2)
- **PostgreSQL**: Primary database with replication
- **Redis**: Distributed cache
- **Monitoring**: Prometheus + Grafana for metrics
- **Auto-Healing**: Health checks + auto-restart + recovery

### Layer 4: GITHUB ENTERPRISE
- **Organization**: abc-io-enterprises
- **Repository**: redot2 (single source of truth)
- **Secrets**: All production keys and credentials
- **CI/CD**: Automated testing and deployment
- **Webhooks**: Trigger deployments on push

---

## Integration Points

### 1. LOCAL → CLOUD SYNC
- Desktop operator makes change
- Git commit triggered automatically
- Push to GitHub (if online)
- Webhook triggers VPS deployment
- VPS services auto-update
- Notification back to desktop + mobile

### 2. MOBILE → LOCAL COMMUNICATION
- APK connects to local http://localhost:8500
- Shows owner dashboard view on phone
- Can trigger healing from mobile
- Mobile notifies desktop of issues
- Emergency beacon relay if needed

### 3. CLOUD → LOCAL FALLBACK
- If VPS online: primary service from cloud
- If VPS offline: fallback to local
- Mobile app auto-switches endpoint
- Reconnect and sync when VPS back online

### 4. AUTO-HEALING WORKFLOW
- Health check runs every 5 minutes
- If service down: automatic restart
- If still down: attempt recovery
- If recovery fails: notify operator
- Operator can manually intervene
- System logs all actions

---

## Operator Control Capabilities

### Dashboard Controls
```
Owner Dashboard (http://localhost:8500)
├── System Status
│   ├── 14 Services (UP/DOWN/ERROR)
│   ├── Health metrics (CPU, Memory, Disk)
│   └── Last check timestamp
├── Manual Controls
│   ├── Restart service (select service)
│   ├── Deploy update (push button)
│   ├── Trigger healing (auto or manual)
│   └── View logs (real-time)
├── Mobile Management
│   ├── Download APK
│   ├── View mobile status
│   ├── Send mobile notification
│   └── Toggle beacon relay
└── Cloud Deployment
    ├── Push to GitHub
    ├── Trigger VPS deployment
    ├── Check VPS status
    └── View deployment history
```

### Mobile APK Controls
```
Android App (redot2-operator.apk)
├── System Status View
│   ├── All services status
│   ├── Last sync time
│   └── Connection status
├── Quick Controls
│   ├── Restart Services
│   ├── Force Sync
│   ├── Emergency Beacon
│   └── Call Support
└── Offline Mode
    ├── View cached status
    ├── Queue actions for sync
    └── Show offline map
```

---

## Self-Healing System

### Health Checks (Every 5 Minutes)
```
1. Service Availability Check
   - Test each container is running
   - Check health endpoints return 200
   - Verify database connection
   - Check Redis connectivity

2. Resource Monitoring
   - CPU usage < 80%
   - Memory usage < 85%
   - Disk usage < 90%
   - Network connectivity

3. Data Integrity
   - Database tables accessible
   - Cache layer responsive
   - Message queues processing
   - Logs writing correctly

4. External Connectivity
   - GitHub accessible
   - Namecheap DNS resolving
   - VPS nodes responding
   - Monitoring systems online
```

### Auto-Healing Actions
```
Trigger 1: Service Down
  → Action: docker compose restart <service>
  → Wait: 30 seconds
  → Check: Health endpoint
  → If OK: Log success, notify operator
  → If FAIL: Try trigger 2

Trigger 2: Resource Exceeded
  → Action: Restart heaviest service
  → Clear cache (redis flush-all)
  → Archive old logs
  → Retry health check

Trigger 3: Connectivity Lost
  → Action: Reload Docker network
  → Reconnect to database
  → Clear connection pool
  → Re-initialize Redis

Trigger 4: Database Connection Failed
  → Action: Restart postgres container
  → Wait for startup (30 seconds)
  → Re-initialize connections
  → Recover from WAL

Trigger 5: Critical Failure
  → Action: Full docker compose down
  → Wait: 10 seconds
  → Action: docker compose up -d
  → Wait: 30 seconds for services
  → Verify all health checks
  → Alert operator
```

---

## Data Synchronization

### Desktop ↔ Cloud Sync
```
Local Change Flow:
1. Operator makes change (code/config/secret)
2. Git commit triggered
3. If online:
   a. Push to GitHub (git push origin master)
   b. GitHub webhook triggers VPS deployment
   c. VPS pulls latest, docker compose restart
   d. Notification sent to desktop + mobile
4. If offline:
   a. Change queued locally
   b. On reconnect: automatic push
   c. VPS deployment triggered
   d. Mobile app notified

Conflict Resolution:
- If both desktop and cloud changed same file:
  → Desktop version wins (operator priority)
  → Cloud version saved as .backup
  → Operator notified
  → Manual merge required
```

### Desktop ↔ Mobile Sync
```
Mobile Connection Flow:
1. APK connects to http://localhost:8500
2. Queries /api/system-status
3. Displays health on phone
4. Can trigger /api/action (restart, heal, etc)
5. Receives notifications via polling

Beacon Relay (Emergency):
- If primary system offline
- Mobile device uses GPS + cellular
- Sends beacon to emergency server
- Location tracked for recovery
- Operator can locate system physically
```

---

## Deployment Timeline

### Phase 1: Enhanced Dashboard (2 hours)
✅ Owner dashboard with operator controls
✅ Health monitoring UI
✅ Manual control buttons
✅ GitHub integration UI

### Phase 2: Mobile APK (3 hours)
✅ React Native APK build
✅ Operator interface on phone
✅ Status display + quick controls
✅ Notification system

### Phase 3: GitHub Setup (1 hour)
✅ Create abc-io-enterprises organization
✅ Create redot2 repository
✅ Configure all secrets
✅ Set up deployment webhooks

### Phase 4: VPS Deployment (2 hours)
✅ Provision 3 Ubuntu servers
✅ Bootstrap with vps-setup.sh
✅ Deploy with vps-deploy.sh
✅ Configure DNS on Namecheap

### Phase 5: Auto-Healing (2 hours)
✅ Create health check script
✅ Deploy monitoring container
✅ Configure auto-restart policies
✅ Implement healing logic

### Phase 6: Documentation (2 hours)
✅ Complete runbook
✅ Recovery procedures
✅ Operator manual
✅ Export to Documents directory

---

## Success Criteria

✅ Desktop operator dashboard fully functional
✅ Mobile APK installed and operational  
✅ Can control system from desktop or phone
✅ System auto-heals failures without intervention
✅ All changes synced to GitHub
✅ VPS deployment fully automated
✅ Public site accessible via abc-io.com
✅ Namecheap domain active and resolving
✅ Billing and purchasing verified working
✅ Complete documentation in Documents directory
✅ System operational 24/7 with offline fallback

---

## System Status

- Desktop: **READY**
- Mobile: **TO BUILD**
- GitHub: **TO SETUP**
- VPS: **TO PROVISION**
- Auto-Healing: **TO IMPLEMENT**
- Documentation: **TO COMPLETE**

**Overall**: Ready to implement all components
