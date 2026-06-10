# Deployment Guide

## Production Setup

1. Provision three VPS nodes.
2. Install Docker Engine and Docker Compose.
3. Copy the repository to each node.
4. Use `compose.prod.yml` on the primary node.

## Primary Node

- Run `docker compose -f compose.prod.yml up -d`
- Ensure `nginx` is routing external traffic to the gateway.
- Validate `k8s`? No, this package is Docker Compose-based.

## Environment Variables

- Copy `.env.example` to `.env`.
- Configure database passwords and service secrets.

## Health Checks

Run `./scripts/health-check.sh` after deployment and confirm:
- API gateway responds
- Operator station is reachable
- Prometheus metrics are available
