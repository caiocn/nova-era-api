# Evolution API Compatibility

## Scope

Nova Era API starts from Evolution API tag `2.3.7` and seeks low-friction migration for existing integrations. Compatibility is a goal, not a blanket guarantee. This document separates **present in inherited code**, **locally contract-tested**, and **not validated**.

## Compatibility matrix

| Area | Contract treatment | Validation state | Notes |
| --- | --- | --- | --- |
| Instance lifecycle | Preserved route shapes: create, list, state, connect, restart, logout, delete, presence | Local HTTP contract test covers global/instance API-key rejection plus creation, state, restart, logout, fetch and presence route identity. | Keep `apikey` header and `instanceName` parameters. |
| QR/pairing/sessions | Inherited Baileys implementation | Not tested against WhatsApp | Requires authorized device testing. |
| Text/media messages | Inherited `/message/*` routes/payloads | Local HTTP contract test covers authentication, route identity isolation, schema rejection and dispatch of text, media, audio, sticker, reaction and poll messages; separately validated with an authorized WhatsApp device. | No guarantee of carrier/platform behavior. |
| Inbound events/webhooks | Existing event names and event modules preserved | Local contract test covers configuration, event URL suffix, serialized envelope, JWT header derivation, retry policy, non-retryable responses and private-network destination rejection. | Test consumers against a staging webhook receiver. |
| Chatwoot / Typebot / n8n / Dify / OpenAI / Flowise / EvoAI | Existing modules and environment keys preserved | Not integration-tested | Services remain opt-in. |
| WhatsApp Cloud API | Meta webhook and service preserved | Not tested with Meta credentials | Use a separate test app/account. |
| PostgreSQL/MySQL migrations | Existing schemas and migration histories preserved | Not tested on user data | Back up and rehearse on a copy first. |
| Redis persistence | Existing config keys and behavior preserved | Not integration-tested | Choose unique cache prefixes/client names. |
| Manager UI | Independent Nova Era Manager at `/manager/` | Local HTTP contract and container-served login-page checks | Instance inventory and lifecycle operations only; it is not the upstream Manager. |
| `GET /health` | New additive route | Unit/contract-tested | Liveness endpoint only; no upstream equivalent assumed. |
| Route instance identity | Upstream-compatible route identity is authoritative | Regression-tested | Foundation backports CWE-639 fix against query/body override. |

## Preserved identifiers

The following are deliberately **not** renamed in the first foundation because they may be public contracts, stored data or protocol semantics:

- Core instance lifecycle and message API paths and payload property names.
- `apikey` request header.
- `instanceName` path parameter and historical database migration files.
- Event names and event payload shapes.
- External provider names (Meta, Baileys, Chatwoot, Typebot, Dify, etc.).
- Environment variable names used by compatible deployments (`DATABASE_*`, `CACHE_*`, `WEBHOOK_*`, `WA_BUSINESS_*`, and related integrations).

## Nova Era API changes to account for

1. Package identity is `nova-era-api` and the planned version is `0.1.0-alpha.1`.
2. Default non-protocol labels, Docker work directory and Compose volume/network names use `nova-era`/`nova_era`.
   Existing deployments must retain their current database name, database role, Redis prefix and Docker volumes until their data and session state have been migrated deliberately.
3. The upstream embedded Manager is not distributed. The optional Nova Era Manager is independently authored, served at `/manager/`, and uses an HttpOnly server session rather than browser-stored API keys.
4. Defaults in examples are safer: telemetry off, explicit local CORS origin, optional Manager enabled and placeholder API key. Operators must provide their own production values.
5. The new `/health` endpoint is additive.
6. The query/body override of `instanceName`/`instanceId` is rejected when merging untrusted data into route instance context. Clients that redundantly sent those fields should remove them; the route parameter is authoritative.
7. External Kafka, SQS, S3/MinIO, webhook JWT and Meta verification defaults use Nova Era API identifiers. See [external identifier migration](../operations/EXTERNAL_IDENTIFIERS_MIGRATION.md).

### Breaking cutover in 0.2.0-alpha.1

In `0.2.0-alpha.1`, the remaining upstream channel and bot contracts were transitioned under a strict no-alias policy:
- `/webhook/evolution` was removed in favor of `/webhook/nova-era`.
- `/evolutionBot/*` was removed in favor of `/novaEraBot/*`.
- `Integration.EVOLUTION` was replaced by `Integration.NOVA_ERA`.
- Database tables `EvolutionBot` and `EvolutionBotSetting` were renamed to `NovaEraBot` and `NovaEraBotSetting`.
- Integration session types `evolution` were migrated to `nova-era`.
See [breaking migration design](../operations/NOVA_ERA_BREAKING_MIGRATION.md) and [migration runbook](../operations/RUNBOOK_0.2.0_BREAKING_MIGRATION.md).

## Migration procedure (non-destructive)

1. **Inventory:** record the current Evolution API version, commit/image, database provider, cache mode, integration settings, webhook consumers and all custom routes.
2. **Back up:** take a verified PostgreSQL/MySQL backup, Redis snapshot where relevant, and secure copies of session state. Test restore separately.
3. **Stage first:** restore a sanitized copy into isolated infrastructure. Never point an alpha deployment at production data first.
4. **Keep provider/config compatibility:** retain the existing `DATABASE_PROVIDER`, connection schema and migration history. Use a new `DATABASE_CONNECTION_CLIENT_NAME`/Redis prefix if sharing infrastructure intentionally.
5. **Deploy:** configure Nova Era API using reviewed secrets and run `npm run db:deploy` only after a migration dry-run/rehearsal. No schema transformation is introduced by the foundation itself.
6. **Rename infrastructure separately:** a branding rename does not move PostgreSQL data, Redis keys or mounted Baileys session files. Back up and restore/copy the existing resources, then update the database client name, Redis prefix and enabled broker identifiers before cutover.
7. **Contract test:** compare key endpoint status/body shapes, webhook payloads and integration behavior against expected fixtures.
8. **Manual channel test:** with authorized test accounts, test QR/pairing, inbound/outbound messages, reconnect and logout/re-link.
9. **Cut over gradually:** route a small controlled workload, monitor errors, retain rollback access and do not discard the prior deployment/data until success criteria are met.

## Rollback

Do not assume database rollback is automatic. Use the retained application image/source and a tested backup/restore plan. If an upstream migration was applied, review its SQL before any rollback decision. Preserve session credentials securely and rotate secrets if exposure is suspected.

## What has not been validated

No real WhatsApp login, messaging, Meta Cloud API flow, external integration delivery, user database migration, Docker container startup or data persistence is claimed as validated until the corresponding tests are executed and recorded.
