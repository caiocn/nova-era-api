# Upstream Analysis — Evolution API

**Assessment date:** 2026-10-23

**Scope:** technical and redistribution triage for Nova Era API. This is not legal advice.

## Decision

Nova Era API is based on **Evolution API tag `2.3.7`**, annotated tag target:

| Item | Value |
| --- | --- |
| Upstream repository | `https://github.com/evolution-foundation/evolution-api` |
| Selected tag | `2.3.7` |
| Selected commit | `cd800f2976e1e5b682fbf86a01ee4d85ae61f370` |
| Commit date | 2025-12-05T11:28:52-03:00 |
| Nova Era API branch | `community-main` |
| Baileys package | `7.0.0-rc14` |
| Upstream remote | `upstream` → `https://github.com/evolution-foundation/evolution-api.git` |
| Origin remote | deliberately unset until a real Nova Era API repository URL exists |

The local Git clone starts at the upstream commit and therefore retains its reachable history. `community-main` records Nova Era API-only commits. `upstream` fetches heads and tags; no remote was pushed or created.

## Tag and release evaluation

Remote tag inspection confirmed `2.3.7` exists. Later tags available at the time of assessment are `2.4.0-rc1` and `2.4.0-rc2`; neither is a stable final `2.4.0` release. The gap from `2.3.7` to `2.4.0-rc2` is **125 commits** and roughly **5,328 additions / 1,080 deletions**.

`2.3.7` is the conservative initial base because it:

- is the last stable non-release-candidate tag identified;
- has a documented changelog and complete dependency lockfile;
- includes Baileys `7.0.0-rc.9`, PostgreSQL/MySQL schemas and current integration surface;
- avoids importing the later mandatory licensing/runtime gate introduced at upstream commit `71bf563036c5799c74801be0e54a80eb3445a27f` (2026-05-06), which blocks business traffic until an Evolution Foundation licensing server activates the instance;
- avoids importing upstream's 2026 private Manager distribution, new protected brand assets and related licensing coupling without a separate redistribution assessment.

### Later upstream changes worth tracking, not blindly merging

| Revision | Finding | Nova Era API disposition |
| --- | --- | --- |
| `2.4.0-rc1` / `2.4.0-rc2` | Adds messaging features, database changes, Manager rework and a mandatory external licensing activation gate. | Do not merge wholesale; it is RC-only and has a material operational/contract change. |
| `2.4.0-rc2` | Fixes `@lid` handling, quoted audio, instance-name trimming, GIF sends and an Evolution Channel state issue. | Assess each isolated fix with regression tests. |
| `7a55a2bf` (2026-05-19) | Documents CWE-639: query/body `instanceName` could override an already authorized route parameter. | Backported in the foundation, with a regression test. |
| `c1ebddf8` (Baileys rc10 branch) | Updates Baileys to rc10 and adds a package patch. | Deferred: Baileys changes require connection/session regression coverage. |
| later `develop` | Contains Prisma 7, Express 5 and broad dependency upgrades. | Deferred: too broad for the foundation baseline. |

The upstream repository history is evidence of changes but not a complete list of regressions. Future maintainers must inspect release notes, open issues, commits and test results before backporting.

## Existing architecture

### Runtime

- **Language/runtime:** TypeScript, CommonJS, Express 4, Node (Docker originally used Node 24; Nova Era API standardizes its image on Node 22 LTS).
- **Build:** `tsc --noEmit && tsup`; path aliases come from `tsconfig.json`.
- **HTTP pattern:** thin controllers, services, `RouterBroker` route helpers, JSON Schema validation and custom HTTP exceptions.
- **Authentication:** `apikey` header accepts a global key or an instance token. Routes with an instance parameter use `instanceExistsGuard`, `instanceLoggedGuard` and `authGuard.apikey`.
- **Multi-tenancy:** instance name / ID scope is expected throughout repository and channel-service operations. It is a critical security boundary.

### Channels and sessions

- **Baileys channel:** `src/api/integrations/channel/whatsapp/whatsapp.baileys.service.ts` constructs `makeWASocket`, coordinates QR/pairing, reconnects, incoming events and message operations. Session credentials can persist through Prisma, Redis DB or provider-files utilities.
- **Official WhatsApp Cloud API:** Meta router at `/webhook/meta` and `whatsapp.business.service.ts`; config uses `WA_BUSINESS_*` variables.
- **Evolution channel:** an upstream channel integration exists, but its name is a compatibility/protocol identifier and is not Nova Era API branding.

### Persistence and cache

- Prisma has separate `postgresql-schema.prisma`, `mysql-schema.prisma` and `psql_bouncer-schema.prisma` with provider-specific migration directories.
- PostgreSQL and MySQL migrations are versioned in the repository.
- Redis supports cache and optional instance/session persistence. Node-cache is a fallback.
- Docker entrypoint runs `db:deploy` then regenerates Prisma. Migration commands copy the selected provider migration tree into a temporary `prisma/migrations` path.

### Events and integrations

- Event sinks: webhook, WebSocket, RabbitMQ, NATS, Kafka, Amazon SQS and Pusher.
- Chatbot/CRM integrations: Chatwoot, Typebot, n8n, Dify, OpenAI, Flowise, EvoAI and EvolutionBot.
- Storage: S3/MinIO.
- Optional external services are activated through environment variables; they are not required for the minimal API + PostgreSQL + Redis Compose deployment.

## API and compatibility inventory

Preserve route paths, route parameter names, API key header, integration identifiers, event names, payload shapes, persisted schema/migration history and externally deployed environment keys until a documented migration replaces them.

| Area | Selected-base routes/modules | Foundation status |
| --- | --- | --- |
| Instances | `/instance/create`, `fetchInstances`, `connect`, `connectionState`, `restart`, `logout`, `delete`, `setPresence` | HTTP contract coverage validates API-key enforcement and request identity on create, fetch, state, restart, logout and presence; live provider lifecycle is validated separately. |
| Messages | `/message/*` including text, media, reactions and other upstream send operations | HTTP contract coverage validates authentication, schema rejection, identity isolation and dispatch shape for text, media, audio, sticker, reaction and poll; authorized-device message tests are recorded separately. |
| Chats/groups/labels/calls | `/chat/*`, `/group/*`, `/label/*`, `/call/*` | Present; contract validation pending. |
| Webhooks/events | `/webhook/*`, `/websocket/*`, `/rabbitmq/*`, `/nats/*`, `/kafka/*`, `/sqs/*`, `/pusher/*` | Webhook configuration, SSRF prevention, local delivery/retry payload contracts and common event-sink configuration contract are tested; non-webhook event delivery remains pending integration tests. |
| Baileys helpers | `/baileys/*` | Present; package upgraded to rc14 and authorized-device baseline validation recorded separately. |
| Meta Cloud API | `/webhook/meta`, business/template modules | Present; no Meta credentials or live test used. |
| Integrations | Chatwoot, Typebot, n8n, Dify, OpenAI, Flowise, EvoAI | Present; disabled by default unless configured. |

`GET /health` is a Nova Era API addition. It makes no WhatsApp, database or Redis request and is intended for container liveness only. It does not prove readiness of dependencies or a session connection.

## Branding inventory

### Renamed in foundation

- npm package name/version/description and repository placeholders.
- Docker work directory, image references, volume/network names and non-protocol cache/client defaults.
- Documentation, governance and operator-facing project identity.
- Compose defaults and example configuration labels.

### Preserved for compatibility or attribution

- API path shapes, `apikey` header, data models, migration histories, event names and integration configuration keys.
- Existing environment key names such as `WA_BUSINESS_*`, `DATABASE_*` and `WEBHOOK_*`.
- `evolution` identifiers that may be an upstream protocol/channel/integration semantic rather than branding.
- Upstream name references in `LICENSE`, `NOTICE`, provenance and compatibility documentation.

### Removed or blocked

- `manager/` prebuilt artifacts, the upstream Manager gitlink and `manager_install.sh`.
- Evolution logo, wordmark and other public upstream visual assets under `public/images`.
- Compose frontend service and `/manager` asset route.

The removed material is not claimed to be legally unusable in every situation; it is excluded because the selected base's licence restricts modification/removal of frontend logo/copyright information, and the later upstream policy explicitly treats the Manager source as private and visual identity as protected. Reintroducing a manager requires independent legal and technical review.

## Licensing and redistribution triage

### Selected base

The `2.3.7` `LICENSE` says it is Apache License 2.0 **with additional conditions**:

1. A commercial licence may be required if frontend logo/copyright information is removed or modified when using Evolution frontend components.
2. Use as part of any project requires a clear notice that Evolution API is used, visible to system administrators and accessible from documentation/settings; non-compliance may require a commercial licence.
3. It also claimed contributors agree the producer may adjust the open-source agreement.

The terms are unusual relative to unmodified Apache-2.0 and require qualified legal review before a public derivative release. The upstream `LICENSE` is retained verbatim; Nova Era API has **not selected a replacement licence**.

### Later upstream materials (not imported as the base licence)

At `2.4.0-rc2`, upstream adds `NOTICE` and `TRADEMARKS.md`. The policy identifies `Evolution Foundation`, `Evolution` and `Evolution API`, logos/wordmarks and visual identity elements as protected; it permits truthful nominative references but requires modified UIs to replace upstream branding. Its Manager source is described in release notes as moved to a private repository while a prebuilt bundle is distributed. These later files are important risk signals, but they do not retroactively resolve selected-base licensing ambiguity.

### Manager status

In `2.3.7`, the upstream Manager is a gitlink at commit `f054b9bc28083152d4948f835e3346fd0add39db`, and `manager/dist` contains built frontend assets. This foundation removes that gitlink and the associated assets. No distributable licence was established for the separate component in this audit. Later upstream documentation says the Manager source moved to a private repository. Therefore:

- Do not redistribute the selected-base Manager bundle or its assets as Nova Era API Manager.
- Do not rely on the external Manager repository as a required service.
- The independently authored Nova Era Manager follows this boundary: it uses the documented API contract, Nova Era assets and source controlled in this repository; it does not redistribute upstream Manager code or assets.

### Trademark and name risk

Apache-2.0 does not grant trademark rights beyond descriptive use. This foundation uses Evolution names only to describe origin/compatibility and does not include their logos. The availability of **Nova Era API** as a trademark, company name, domain or social identity was **not** checked and must not be assumed.

### Required human review before publication

1. Confirm whether the selected upstream additional conditions permit this derivative's public distribution and whether the upstream usage notice must remain in every operator-facing deployment.
2. Audit direct/transitive dependency licences and notice obligations from `package-lock.json`, plus binary media/tool components in the image.
3. Clear Nova Era API name/trademark/domain availability in jurisdictions and markets of intended use.
4. Define the licence for Nova Era API-owned additions without misrepresenting rights in upstream-derived code.
5. Obtain explicit approval before publishing an image, repository, release or Manager.

## Security findings and action

- **Backported:** upstream commit `7a55a2bf` fixes a cross-instance authorization bypass (CWE-639) caused by merging untrusted `instanceName`/`instanceId` query/body input into an already authorized route identity. The foundation strips those keys before the merge and includes a regression test.
- **Configuration defaults:** examples no longer contain a reusable global API key, enable telemetry by default, expose all CORS origins or enable the upstream Manager. The optional Nova Era Manager uses a server-side HttpOnly session and is enabled separately through configuration; operators must still set safe deployment values.
- **Audit status:** historical foundation installation reported 99 dependency vulnerabilities (4 critical, 31 high, 62 moderate, 2 low). The current authoritative counts and remediation records are in `docs/security/VULNERABILITY_TRIAGE.md`. The security workflow records the audit JSON as an artifact for review rather than silencing it; unresolved high findings remain a release blocker. This project does not run blanket `npm audit fix --force`.
- **Known code risks requiring follow-up:** root route currently fetches the latest WhatsApp Web version from a network source, application error webhooks include the global API key in outbound data, and CORS can still be configured to unsafe values. The foundation permits no-`Origin` server-to-server/health-check requests while retaining explicit browser-origin checks; broader CORS and webhook hardening need focused follow-up.

## Validation performed for this foundation

- Confirmed remote tags and branches with `git ls-remote` / `git fetch --tags upstream`.
- Installed the locked dependencies via `npm run ci`.
- Generated a PostgreSQL Prisma client via `DATABASE_PROVIDER=postgresql npm run db:generate`.
- Ran the foundation regression tests via `npm test`.
- Build/lint/Docker results are recorded in the final implementation report and maintenance documentation after those commands are run.

## Decision record

Maintain `community-main` on `2.3.7`, backport isolated security fixes with tests, and treat upstream updates as reviewed inputs rather than automatic merges. This produces a smaller, auditable foundation while preserving an upgrade path.
