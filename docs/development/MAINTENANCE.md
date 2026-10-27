# Maintenance Guide

## Upstream workflow

The upstream remote is intentionally retained:

```bash
git fetch upstream --tags
git log --oneline community-main..upstream/main
git log --oneline community-main..upstream/develop
```

Never merge upstream automatically. For each candidate:

1. Identify its licence, trademark, security, schema, HTTP-contract and dependency impact.
2. Prefer a small reviewed cherry-pick/backport over a broad merge.
3. Add or update a regression test before changing behavior where practical.
4. Test against isolated infrastructure and authorized external accounts where required.
5. Record the upstream commit, rationale and compatibility impact in the changelog/release notes.

Use `git range-diff` or a reviewable PR to understand conflicts with Nova Era changes. Keep Nova Era branding, `NOTICE`, independent governance and Manager exclusion intact during future merges.

## Routine cadence

| Cadence | Activity |
| --- | --- |
| Weekly | Inspect upstream tags/commits, Baileys releases, GitHub advisories and `npm audit`. |
| Monthly | Review stale dependencies, image base updates, CI status and documentation accuracy. |
| Before every release | Run lockfile audit, tests/lint/build, Docker build, Compose smoke test, secret scan and diff/licensing review. |
| Per security report | Privately triage impact, minimize reproduction, fix/test, coordinate disclosure and publish an advisory when appropriate. |

## Dependency and CVE triage

Run:

```bash
npm audit --omit=dev --json > /tmp/opencode/nova-era-api-audit.json
npm outdated
```

For every high/critical advisory, document whether the vulnerable code is runtime-reachable, direct/transitive, patched, deferred with a review date or requires mitigation. CI archives its raw audit JSON for this review; a non-zero audit must never be masked as a passing security check. Avoid `npm audit fix --force` as a release strategy: it may introduce unreviewed framework, Prisma or Baileys breaking changes.

The current prioritized record is [VULNERABILITY_TRIAGE.md](../security/VULNERABILITY_TRIAGE.md). Update it whenever the lockfile, base image or audit result changes.

## Baileys

Follow [BAILEYS_MAINTENANCE.md](../architecture/BAILEYS_MAINTENANCE.md). Treat connection/session changes as external integration changes, not routine dependency bumps.

## Native image processing

Sharp is the sole image processor used by Nova Era API. Its optional Jimp peer through Baileys is intentionally omitted by `npm run ci`; Baileys selects Sharp when present. Do not add Jimp back without a security review and a demonstrated need that Sharp cannot meet. Follow `IMAGE_PROCESSING_MAINTENANCE.md` in the architecture documentation for image limits, test coverage and accepted pending validation.

## Database and backups

- Keep provider migration directories immutable once published.
- Add migrations separately from unrelated behavior changes.
- Test migrations against a database copy and measure lock/upgrade behavior.
- Back up PostgreSQL/MySQL, Redis session state when applicable and filesystem session volumes.
- Document restore commands and prove them periodically in isolated infrastructure.

## Releases

1. Ensure the version is independent from upstream and follows SemVer.
2. Update `CHANGELOG.md` with upstream base/revisions and compatibility notes.
3. Build an SBOM and image only after legal review permits publication.
4. Tag only after all applicable local quality gates and deployment checks pass.
5. Publish manually with maintainer approval; no workflow should publish as a side effect of a branch push.

## Pull request review

Require at least one maintainer review, passing CI, a compatibility note, migration impact statement and evidence for claimed tests. Changes to authentication, instance isolation, webhooks, configuration defaults, Docker, licensing or branding require focused security/legal review as applicable.

## Local environment guide

Use `.env.example` as a template, but never treat its placeholders as deployable secrets. The minimal local validation sequence is:

```bash
npm run ci
DATABASE_PROVIDER=postgresql npm run db:generate
npm test
npm run lint:check
npm run build
docker build -t nova-era-api:local .
```

Run Compose only with isolated data. Do not publish logs, images or source remotely without explicit maintainer authorization.
