# Contributing to ABC-IO v2.0 (redot2)

Thank you for contributing to ABC-IO. This repository follows enterprise-grade development practices. Please read this guide before opening an issue or pull request.

## Quick Start

1. Fork the repository (for external contributors) or create a feature branch (for organization members).
2. Install prerequisites: Docker Engine 24+, Docker Compose 2.20+, Git 2.40+, and Node.js 20 (for local linting).
3. Copy `.env.example` to `.env` and fill in local development values.
4. Run `docker compose up -d` and verify with `./scripts/health-check.sh`.

## Branch Naming

Use semantic branch prefixes:

- `feat/` — new feature
- `fix/` — bug fix
- `docs/` — documentation only
- `chore/` — maintenance, dependency updates
- `security/` — security patch
- `refactor/` — code restructuring with no behavior change
- `hotfix/` — production-critical fix

Examples: `feat/gateway-rate-limit-tiers`, `fix/redis-reconnect-timeout`.

## Commit Messages

Use [Conventional Commits](https://www.conventionalcommits.org/):

```text
<type>(<scope>): <short description>

<body>

Refs: #<issue-number>
```

Allowed types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `perf`, `security`, `revert`.

## Pull Request Process

1. **Open a draft PR early** for large changes.
2. Fill in the PR template completely.
3. Ensure all required status checks pass (CI build, dependency review, secret scanning, CodeQL).
4. Request review from the CODEOWNERS for each affected path.
5. Squash-merge is preferred for feature branches; rebase-merge is allowed for long-lived epic branches.
6. After merge, monitor the `deploy.yml` workflow if your change triggers a release.

## Security

- Never commit secrets, `.env` files, private keys, or tokens.
- Report vulnerabilities via the [Security tab](../../security/advisories/new) or email `security@abc-io.com`.
- See [SECURITY.md](./SECURITY.md) for our responsible disclosure policy.

## Code Style

- JavaScript: CommonJS, `const`/`let`, no `var`, `async/await` preferred over raw callbacks.
- Python: standard `logging`, environment-driven configuration, type hints encouraged.
- Docker: pin base images, minimize layers, run non-root in production services.
- SQL: migrations must be idempotent; never drop production columns without a deprecation window.

## Testing

There is no unit-test framework in this project. Validate changes operationally:

```bash
docker compose build
./scripts/health-check.sh
./scripts/auto-heal.sh
```

For gateway changes, also verify:

```bash
curl -f http://localhost:4000/health
curl -f http://localhost:4000/api/v1/ai/health
```

## Questions?

- Architecture: open a Discussion in the `Architecture` category.
- Operational support: contact `#platform-ops` on Slack/Teams.
