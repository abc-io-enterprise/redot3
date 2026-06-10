## Summary

<!-- One-line summary of the change -->

## Related Issues

<!-- Link to issues, discussions, or tickets -->

## Change Type

<!-- Check all that apply -->

- [ ] `feat` — New feature
- [ ] `fix` — Bug fix
- [ ] `docs` — Documentation only
- [ ] `style` — Formatting, missing semi colons, etc.
- [ ] `refactor` — Code restructuring
- [ ] `perf` — Performance improvement
- [ ] `test` — Adding or updating tests
- [ ] `chore` — Build process or auxiliary tool changes
- [ ] `security` — Security patch
- [ ] `revert` — Reverts a previous commit

## Affected Services

<!-- Check all that apply -->

- [ ] gateway
- [ ] operator-station
- [ ] owner-dashboard
- [ ] mobile-gateway
- [ ] public-portal
- [ ] beacon
- [ ] beacon-pwa
- [ ] kimi
- [ ] worker
- [ ] ai-isp
- [ ] infrastructure / deployment
- [ ] documentation

## Testing

<!-- How was this change validated? Include commands, curl outputs, or screenshots -->

```bash
# Example
./scripts/health-check.sh
```

## Checklist

- [ ] I have read the [CONTRIBUTING.md](./CONTRIBUTING.md) guide.
- [ ] My branch name follows the convention (`feat/`, `fix/`, etc.).
- [ ] My commits use [Conventional Commits](https://www.conventionalcommits.org/).
- [ ] I have not committed secrets, `.env` files, or private keys.
- [ ] I have updated `AGENTS.md` if my change affects agent-facing conventions.
- [ ] I have requested review from the relevant CODEOWNERS.
- [ ] CI checks pass or I have explained why they are expected to fail.

## Deployment Notes

<!-- Does this change require a specific deployment order, migration, or feature flag? -->
