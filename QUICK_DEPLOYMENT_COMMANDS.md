# ABC-IO v2.0 - QUICK DEPLOYMENT COMMANDS REFERENCE
# June 12, 2026
# Owner: Christopher Porreca

---

## ⚡ QUICK START - COPY & PASTE COMMANDS

### PHASE 1: STAGING (LOCAL MACHINE - Windows PowerShell)

```powershell
cd "C:\Users\cplexmath\OneDrive\Documents\redot2"
docker compose -f compose.staging.yml down --remove-orphans
docker compose -f compose.staging.yml up -d --remove-orphans
Start-Sleep -Seconds 30
./scripts/health-check.sh
```

**Verify:**
```powershell
curl -I http://localhost:4000/health
curl -I http://localhost:8500/health
docker compose -f compose.staging.yml ps
```

---

### PHASE 2: PRODUCTION - REDOT1 (Primary VPS - 162.254.32.142)

**Connect:**
```bash
ssh root@162.254.32.142
```

**Deploy:**
```bash
cd /opt/redot2
docker compose -f compose.prod.yml pull
docker compose -f compose.prod.yml down
docker compose -f compose.prod.yml up -d --remove-orphans
sleep 30
./scripts/health-check.sh
```

**Verify:**
```bash
curl -I https://abc-io.com/health
docker compose -f compose.prod.yml ps
docker compose -f compose.prod.yml logs
```

**Check Services:**
```bash
docker compose -f compose.prod.yml exec postgres psql -U postgres -d abc_io -c "SELECT version();"
docker compose -f compose.prod.yml exec redis redis-cli ping
```

---

### PHASE 3: PRODUCTION - AI1 (AI Replica 1 - 192.227.212.235)

**Connect:**
```bash
ssh root@192.227.212.235
```

**Deploy:**
```bash
cd /opt/redot2
docker compose -f compose.replica-ai1.yml pull
docker compose -f compose.replica-ai1.yml down
docker compose -f compose.replica-ai1.yml up -d --remove-orphans
sleep 30
./scripts/health-check.sh
```

**Verify:**
```bash
curl -I http://localhost:5000/health
curl -I http://localhost:7000/health
docker compose -f compose.replica-ai1.yml ps
```

---

### PHASE 4: PRODUCTION - AI2 (AI Replica 2 - 192.227.212.237)

**Connect:**
```bash
ssh root@192.227.212.237
```

**Deploy:**
```bash
cd /opt/redot2
docker compose -f compose.replica-ai2.yml pull
docker compose -f compose.replica-ai2.yml down
docker compose -f compose.replica-ai2.yml up -d --remove-orphans
sleep 30
./scripts/health-check.sh
```

**Verify:**
```bash
curl -I http://localhost:5000/health
curl -I http://localhost:7000/health
docker compose -f compose.replica-ai2.yml ps
```

---

## 🔍 HEALTH CHECK COMMANDS

### Local Services
```bash
# All services
./scripts/health-check.sh

# Individual services
curl -I http://localhost:4000/health      # Gateway
curl -I http://localhost:5000/health      # Kimi LLM
curl -I http://localhost:8500/health      # Owner Dashboard
curl -I http://localhost:14000/api/health # Grafana
curl -I http://localhost:9091/-/healthy   # Prometheus
```

### Production Services (redot1)
```bash
# All services
./scripts/health-check.sh

# Public endpoints
curl -I https://abc-io.com/health
curl -I https://abc-io.com/

# Database
docker compose -f compose.prod.yml exec postgres psql -U postgres -d abc_io -c "SELECT version();"

# Cache
docker compose -f compose.prod.yml exec redis redis-cli ping
```

### AI Services (ai1 & ai2)
```bash
# Health checks
./scripts/health-check.sh

# Kimi LLM
curl -I http://localhost:5000/health

# AI-ISP
curl -I http://localhost:7000/health
```

---

## 📊 MONITORING & LOGS

### View Logs
```bash
# All services
docker compose -f compose.prod.yml logs -f

# Specific service
docker compose -f compose.prod.yml logs -f gateway
docker compose -f compose.prod.yml logs -f kimi
docker compose -f compose.prod.yml logs -f postgres

# Last 100 lines
docker compose -f compose.prod.yml logs --tail=100
```

### Service Status
```bash
# List all services
docker compose -f compose.prod.yml ps

# Check running containers
docker ps

# Resource usage
docker stats

# Container inspection
docker inspect container_name
```

### Dashboard Access
```
Grafana:      http://localhost:14000 (admin/admin)
Prometheus:   http://localhost:9091
Jaeger:       http://localhost:16686
Redoc API:    https://abc-io.com/api/docs
```

---

## 🔄 RESTART SERVICES

### Restart All Services
```bash
# On each VPS node
docker compose -f compose.prod.yml restart
```

### Restart Specific Service
```bash
# Gateway
docker compose -f compose.prod.yml restart gateway

# Kimi
docker compose -f compose.prod.yml restart kimi

# Redis
docker compose -f compose.prod.yml restart redis
```

### Hard Restart (Stop & Start)
```bash
# Stop all
docker compose -f compose.prod.yml stop

# Start all
docker compose -f compose.prod.yml start
```

---

## 🛑 STOP & CLEANUP

### Stop All Services
```bash
docker compose -f compose.prod.yml stop
```

### Remove All Services & Volumes
```bash
docker compose -f compose.prod.yml down -v
```

### Remove Orphaned Containers
```bash
docker compose -f compose.prod.yml down --remove-orphans
```

### Cleanup Unused Docker Resources
```bash
docker system prune -a
```

---

## 🔙 ROLLBACK PROCEDURE

### If Deployment Fails
```bash
# On affected VPS node

# Stop current deployment
docker compose -f compose.prod.yml down

# Revert to previous version
git checkout v5.0.0

# Start previous version
docker compose -f compose.prod.yml up -d

# Verify
./scripts/health-check.sh
```

### Database Recovery
```bash
# If database issues occur
docker compose -f compose.prod.yml exec postgres \
  psql -U postgres -d abc_io -c "VACUUM ANALYZE;"
```

---

## 🚨 TROUBLESHOOTING

### Service Not Starting
```bash
# Check logs
docker compose -f compose.prod.yml logs service_name

# Check configuration
docker compose config

# Verify environment variables
env | grep -i redot2
```

### Port Already in Use
```bash
# Find process using port
sudo lsof -i :port_number

# Or
sudo netstat -tlnp | grep :port_number

# Kill process if needed
sudo kill -9 process_id
```

### Memory Issues
```bash
# Check current usage
docker stats

# Check limits
docker inspect container_name | grep -i memory

# Increase limit in compose file
# memory: 1g  (change limit)
```

### Network Issues
```bash
# Check network connectivity
docker network ls
docker network inspect redot2_default

# Verify DNS
nslookup abc-io.com
dig abc-io.com
```

### SSL Certificate Issues
```bash
# Check certificate
curl -I https://abc-io.com/

# Verify cert expiry
echo | openssl s_client -servername abc-io.com -connect abc-io.com:443 2>/dev/null | openssl x509 -noout -dates
```

---

## 📋 PRE-DEPLOYMENT CHECKLIST

Before Running Deployments:

- [ ] .env file exists and has all variables populated
- [ ] SSH keys configured (or passwords ready)
- [ ] Docker installed on all VPS nodes
- [ ] Sufficient disk space (at least 50GB free)
- [ ] Port 80, 443 open on primary VPS
- [ ] DNS records pointing to correct IPs
- [ ] SSL certificate valid (Let's Encrypt)
- [ ] Network connectivity verified
- [ ] Database backups configured
- [ ] Monitoring dashboards accessible

---

## ✅ POST-DEPLOYMENT CHECKLIST

After Deployments Complete:

- [ ] All services healthy (health check passed)
- [ ] Public endpoints responding (HTTP 200)
- [ ] Database connected and responsive
- [ ] Cache operational (Redis ping)
- [ ] Logs showing no errors
- [ ] Dashboards accessible and populated
- [ ] Payment webhooks receiving events
- [ ] Email delivery working
- [ ] SSL certificate valid
- [ ] Error rate < 1%
- [ ] Response time P95 < 200ms

---

## 📞 EMERGENCY CONTACTS

**Owner & Decision Maker:**
- Name: Christopher Porreca
- Email: owner@abc-io.com
- Phone: +1-585-348-7120
- Timezone: Eastern Time (ET)

**Support Team (24/7):**
- Email: support@abc-io.com
- Hours: 24/7

**Critical Issues:**
- Call owner immediately
- Email support team
- Check monitoring dashboards

---

## 🏁 DEPLOYMENT SUCCESS SIGNALS

✅ **Staging:**
- All 27 services running
- Health checks 100% passing
- No error logs
- All endpoints responding

✅ **Production - Redot1:**
- API Gateway responding
- Database connected
- Cache operational
- Public endpoints responding

✅ **Production - AI1 & AI2:**
- Kimi LLM responding
- AI-ISP responding
- Connected to primary backend
- Health checks passing

✅ **System-Wide:**
- Error rate < 1%
- Response time P95 < 200ms
- Payment processing working
- Email delivery confirmed
- Uptime > 99.9%

---

## 🎉 YOU'RE DONE

When all deployments complete and all checks pass:

1. Notify owner (Christopher Porreca)
2. Document any issues encountered
3. Monitor dashboards for 24 hours
4. Alert on any anomalies
5. Schedule post-launch review

---

*100 Years Nonstop — Always On, Always Yours, Always Here*

Generated: June 12, 2026
System: ABC-IO v2.0 (v5.0.0)
Domain: https://abc-io.com
