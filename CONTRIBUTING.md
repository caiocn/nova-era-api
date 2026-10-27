# Contributing to Nova Era API

Thank you for helping build an independent, compatible and maintainable messaging API.

## Before you begin

- Search existing issues once the public tracker has been configured.
- Do not submit proprietary code, secrets, account credentials, customer data or upstream Manager assets.
- Preserve compatibility unless the issue and migration documentation explicitly approve a breaking change.
- Changes involving licensing, trademarks, authentication, database migrations, Baileys upgrades or external integrations need maintainer review before merge.

## Local setup

```bash
cp .env.example .env
npm ci
DATABASE_PROVIDER=postgresql npm run db:generate
npm test
npm run lint:check
npm run build
```

Use safe local credentials only. `npm run db:deploy` can mutate a database; run it only against an isolated development database that you may change.

## Branches and commits

- Branch from `community-main` until maintainers publish a replacement policy.
- Use short, focused branch names such as `docs/docker-guide` or `fix/webhook-timeout`.
- Use Conventional Commits: `feat:`, `fix:`, `docs:`, `test:`, `ci:`, `chore:`, `security:`.
- Keep each commit narrowly scoped, tested and understandable on its own.

## Pull requests

Each PR should include:

1. Problem and intended outcome.
2. Compatibility impact, including affected routes, payloads, events or environment variables.
3. Migration impact for PostgreSQL, MySQL, Redis and existing sessions where relevant.
4. Validation performed and anything not tested.
5. Documentation and tests for changed behavior.

Never claim a live WhatsApp flow was tested unless the PR contains reproducible evidence from an authorized test account.

## Code expectations

- Keep controllers thin and use existing service/repository patterns.
- Validate external input with the existing JSON schema pattern.
- Scope every multi-tenant operation to its authorized instance.
- Do not log API keys, session credentials, webhook secrets or media containing sensitive data.
- Do not use a pull request to update Baileys and refactor unrelated areas at the same time.

## Reporting bugs and requesting features

Use the repository templates. Include the Nova Era API version, upstream base, database provider, deployment method, redacted logs and a minimal reproduction. For security issues, follow [SECURITY.md](SECURITY.md) instead of opening a public issue.

## Community conduct

Participation is subject to [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
