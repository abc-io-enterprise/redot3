# ABC-IO Consolidated Repository Index

This document maps all 10 source repositories into the consolidated `redot2complete` project.

## Repository Layout

| # | Directory | Source Repo | Status | Description |
|---|-----------|-------------|--------|-------------|
| 01 | [`repositories/01-rd2live-base/`](./repositories/01-rd2live-base/) | `ccplexmath/rd2live` | ✅ Base | ABC-IO v2.0 production microservices (current project root) |
| 02 | [`repositories/02-rd1aii/`](./repositories/02-rd1aii/) | `ccplexmath/rd1aii` | ✅ Copied | v1.x AI ISP with web installer, IPFS, billing tiers |
| 03 | [`repositories/03-redot1system/`](./repositories/03-redot1system/) | `ccplexmath/redot1system` | ✅ Copied | Global Interfacing Provider — TypeScript/React backend, wave deployments |
| 04 | [`repositories/04-rd1backupublive/`](./repositories/04-rd1backupublive/) | `ccplexmath/rd1backupublive` | ⚠️ Remote Only | abc-io.com backup public live git→public_html→3VPS system |
| 05 | [`repositories/05-rd1nc/`](./repositories/05-rd1nc/) | `ccplexmath/rd1nc` | ⚠️ Remote Only | Namecheap DNS/domain backup and configuration |
| 06 | [`repositories/06-abc-ai-node-2/`](./repositories/06-abc-ai-node-2/) | `ccplexmath/abc-ai-node-2` | ✅ Copied | PAIOS + API marketplace + channels + multi-user + privatized |
| 07 | [`repositories/07-redot1live/`](./repositories/07-redot1live/) | `ccplexmath/redot1live` | ⚠️ Remote Only | redot1 live deployment configuration |
| 08 | [`repositories/08-redot1abc-ai/`](./repositories/08-redot1abc-ai/) | `ccplexmath/redot1abc-ai` | ✅ Extracted | redot1abc-ai swarm full (TypeScript) |
| 09 | [`repositories/09-abc-io-system/`](./repositories/09-abc-io-system/) | `ccplexmath/abc-io-system` | ✅ Copied | ON-LIVE AI ISP shell deployment system |
| 10 | [`repositories/10-abc-ai/`](./repositories/10-abc-ai/) | `ccplexmath/abc-ai` | ✅ Copied | ABC-AI HTML gateway, sales support, AI core |

## Git Remotes

All 10 repository remotes are configured in this project. Fetch them with authentication:

```bash
# Set your GitHub PAT (if needed for private repos)
export GITHUB_TOKEN=ghp_xxxxxxxxxxxx

# Fetch all remotes
for remote in rd1aii redot1system rd1backupublive rd1nc abc-ai-node-2 rd2live redot1live redot1abc-ai abc-io-system abc-ai; do
  git fetch $remote
done
```

## Consolidation Notes

### Copied from Local Clones
- **rd1aii** — copied from `~/Documents/rd1aii` (full git history preserved in original location)
- **redot1system** — copied from `~/Documents/redot2/redot1/` (audit report confirms this is the 631-file redot1system archive)
- **abc-ai-node-2** — copied from `~/Documents/redot2/` root workspace excluding `.git`, `redot1/`, and nested archives. This workspace already contained the merged abc-ai-node-2 content.
- **redot1abc-ai** — extracted from `~/Downloads/redot1abc-ai-main.zip`
- **abc-io-system** — copied from `~/.kimi_openclaw/workspace/abc-io-system/`
- **abc-ai** — copied from `~/Downloads/abc-ai-master/abc-ai-master/` excluding nested backup archives and `node_modules`

### Remote-Only (Private GitHub Access Required)
The following repositories were not found in local clones or archives. Their remotes are configured; run `git fetch <remote>` after providing GitHub credentials:
- **rd1backupublive** — Backup/sync system for public_html on 3 VPS nodes
- **rd1nc** — Namecheap domain/DNS configuration backup
- **redot1live** — Live redot1 deployment state

### Origin Target
The consolidated project is intended to be pushed to:
```
https://github.com/ccplexmath/redot2complete.git
```

## Integration Roadmap

1. **Immediate** — All historical code is preserved in `repositories/` for reference.
2. **Gateway Merge** — Unique HTML pages from `abc-ai` and `abc-io-system` can be promoted to `services/public-portal/src/public/`.
3. **Service Migration** — TypeScript services from `redot1abc-ai` and `redot1system` can be containerized and added to `docker-compose.yml`.
4. **Script Consolidation** — Deployment and health-check scripts from all repos are staged for merging into `scripts/`.
5. **Documentation Merge** — Runbooks and architecture docs are indexed in `docs/legacy/`.

## Size Summary

```
repositories/
├── 01-rd2live-base/     → Current project (base)
├── 02-rd1aii/           → ~430 KB
├── 03-redot1system/     → ~1.7 MB
├── 04-rd1backupublive/  → Remote only
├── 05-rd1nc/            → Remote only
├── 06-abc-ai-node-2/    → ~40 MB (excl. archives)
├── 07-redot1live/       → Remote only
├── 08-redot1abc-ai/     → ~1.5 MB
├── 09-abc-io-system/    → ~7 MB (excl. node_modules)
└── 10-abc-ai/           → ~30 MB (excl. nested archives)
```
