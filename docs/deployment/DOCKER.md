# Docker Deployment

## Status

This repository provides a self-hosted Docker Compose reference for API, PostgreSQL and Redis. It does not publish images automatically. The future image reference `ghcr.io/<owner-or-org>/nova-era-api` is a placeholder; container registry owners must be lowercase.

The local image includes the repository `LICENSE` and `NOTICE` at `/nova-era/LICENSE` and `/nova-era/NOTICE`. This is an attribution measure, not a conclusion that the image is cleared for distribution; see the [legal review](../legal/LEGAL_REVIEW.md).

## Prerequisites

- Docker Engine 26+ recommended and Docker Compose v2.
- A private host/network policy for the API; the reference Compose binding is `127.0.0.1:8080`.
- Persistent storage backed up by your platform.

## Configure

```bash
cp .env.example .env
```

Set at least these values in `.env`:

```dotenv
POSTGRES_DATABASE=nova_era_api
POSTGRES_USERNAME=nova_era
POSTGRES_PASSWORD=<long-random-password>
DATABASE_CONNECTION_URI=postgresql://nova_era:<url-encoded-password>@postgres:5432/nova_era_api?schema=public
CACHE_REDIS_URI=redis://redis:6379/6
AUTHENTICATION_API_KEY=<long-random-api-key>
CORS_ORIGIN=https://your-allowed-ui.example
SERVER_DISABLE_MANAGER=false
MANAGER_SESSION_TTL_SECONDS=900
TELEMETRY_ENABLED=false
```

Use a password manager or secret manager; do not commit `.env`. Leave optional event, storage and chatbot integrations disabled until their credentials, endpoint allowlists and data handling have been reviewed.

When enabled, the independently developed Manager is available at `/manager/`. Its sign-in screen accepts the global API key only to establish a short-lived, HttpOnly server session; the key is not returned to or stored by the browser. Set `MANAGER_COOKIE_SECURE=true` when TLS terminates before the API but `SERVER_URL` does not start with `https://`.

If host port 8080 is in use, set `NOVA_ERA_API_PORT=18080` and request `http://127.0.0.1:18080/health`. The container itself continues to listen on port 8080.

## Start

```bash
docker compose config
docker compose up --build -d
docker compose ps
curl --fail http://127.0.0.1:8080/health
```

The `api` container waits for Compose health checks from PostgreSQL and Redis. Its entrypoint applies the configured Prisma migrations before starting the service. This can mutate the selected database: perform a backup and migration rehearsal first.

## Services and persistence

| Service | Purpose | Persistent volume |
| --- | --- | --- |
| `api` | Nova Era API / optional Baileys session filesystem | `nova_era_instances` |
| `postgres` | Primary relational persistence | `nova_era_postgres` |
| `redis` | Cache / optional session state | `nova_era_redis` |

Never remove these volumes as a troubleshooting shortcut. Back them up and verify restores before upgrades. If Redis stores session state (`CACHE_REDIS_SAVE_INSTANCES=true`), include it in your recovery plan.

## Health checks

- API: `GET /health` returns a process liveness response. It does not query the database, Redis or WhatsApp.
- PostgreSQL: `pg_isready`.
- Redis: `redis-cli ping`.

For readiness monitoring, add an authenticated and dependency-aware check only after defining its security and availability semantics; do not expose internals on a public unauthenticated endpoint by default.

## Logs and troubleshooting

```bash
docker compose logs --tail=200 api
docker compose logs --tail=200 postgres redis
docker compose ps
```

Do not paste full logs publicly: they may include phone identifiers, webhooks, headers or configuration. Redact API keys, database URLs, session credentials and user content.

## Docker Swarm

`Docker/swarm/nova-era-api.yaml.example` is a starting point only. It has no real hostnames, images or credentials. Supply a lowercase registry owner, a pinned image version, secret-backed database/API-key values, TLS policy and a reviewed backup plan before deployment. The historical upstream Swarm file was removed because it embedded unsafe example credentials and upstream branding.

## Upgrade and recovery

1. Read the target release notes, changelog and migration SQL.
2. Back up PostgreSQL and, when used for sessions, Redis and `nova_era_instances`.
3. Restore backups to an isolated environment and rehearse migration/startup.
4. Build/deploy the target image without deleting the prior image or volumes.
5. Verify health, logs, migration result and authorized integration tests.
6. Roll back the application image or restore verified data only with a documented plan.

## Branding rename and existing deployments

The Compose defaults use `nova_era_api`, `nova_era_instances`, `nova_era_postgres`, `nova_era_redis` and `nova-era-net` for a new installation. Docker treats different volume or network names as separate entities: renaming the Compose configuration alone does **not** move PostgreSQL data, Redis data or Baileys session files.

For an existing deployment, first back up and validate the current PostgreSQL database, Redis data and instance volume. Restore/copy those contents into the new resources in an isolated rehearsal environment, then update values that act as isolation namespaces (`DATABASE_CONNECTION_CLIENT_NAME`, `CACHE_REDIS_PREFIX_KEY`, and any enabled broker client/group/topic identifiers). Do not remove the old volumes as part of a branding change.

## Limits of validation

The configuration is syntactically reviewed and designed for local build/start validation. The environment may not permit containers or external channel accounts; consult the implementation report for the actual commands/results before treating it as validated.
