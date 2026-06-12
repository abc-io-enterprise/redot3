# ABC-IO Deployment Guide

## 5 Deployment Environments

### 1. Development (Dev)
```bash
# Local live-reload environment
cd abc-io-redot3
npm install
npm run dev
# Access at http://localhost:5173
```

### 2. Staging
```bash
# Build for staging
npm run build
# Deploy to staging server with alternate ports
# Mirrors production configuration
```

### 3. Production (redot1)
```bash
# Production build
npm run build
# Deploy to redot1: 162.254.32.142
# Configure NGINX with SSL
# Set up Prometheus + Grafana monitoring
```

### 4. Replica AI-1
```bash
# Deploy to ai1: 192.227.212.235
# Shares primary DB/Redis
# NGINX upstream target
```

### 5. Replica AI-2
```bash
# Deploy to ai2: 192.227.212.237
# Geographic and failure resilience
# NGINX backup target
```

## Build Process

```bash
# 1. Install dependencies
npm install

# 2. Build production bundle
npm run build

# 3. Output in dist/ directory
# - index.html (entry point)
# - assets/ (bundled JS, CSS, images)

# 4. Deploy dist/ to web server
# Configure SPA fallback to index.html
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| VITE_API_URL | Backend API base URL | Yes |
| VITE_APP_NAME | Application display name | No |

## NGINX Configuration

```nginx
server {
    listen 80;
    server_name abc-io.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name abc-io.com;

    root /var/www/abc-io/dist;
    index index.html;

    # SSL certificates
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API proxy
    location /api {
        proxy_pass http://backend:3000;
        proxy_set_header Host $host;
    }

    # Static assets caching
    location /assets {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

## Docker Deployment

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80 443
```

## Monitoring

- **Prometheus**: Metrics collection
- **Grafana**: Visualization dashboards
- **Uptime**: 99.97% SLA target
- **Alerting**: PagerDuty integration

## Rollback Procedure

1. Preserve previous build in `dist-backup/`
2. Deploy new build to staging first
3. Run smoke tests
4. Swap NGINX upstream to new build
5. Monitor for 15 minutes
6. If issues detected, swap back to previous build
