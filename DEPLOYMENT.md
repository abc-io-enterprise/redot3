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
- For public deployment, configure `MISTRAL_API_KEY`, `MISTRAL_MODEL`, `MISTRAL_API_BASE_URL`, and the owner/mobile/public signing keys.

## Deployment Notes

This repository is designed for Docker Compose deployment. The package is ready to launch on a single primary VPS, or as a multi-host deployment using external DNS and host-level routing.

- Primary node: `nginx`, `gateway`, `owner-dashboard`, `public-portal`, `operator-station`, `kimi`, `worker`, `postgres`, `redis`, `prometheus`, `grafana`, `jaeger`
- Optional secondary AI nodes: clone the repo on additional VPS hosts and run `kimi` and `worker` services behind DNS entries such as `ai1.abc-io.com` and `ai2.abc-io.com`

## Health Checks

Run `./scripts/health-check.sh` after deployment and confirm:
- API gateway responds
- Operator station is reachable
- Prometheus metrics are available
