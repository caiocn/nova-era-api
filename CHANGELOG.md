# Changelog

All notable Nova Era API changes will be recorded here. The project follows [Semantic Versioning](https://semver.org/); Nova Era API versions are independent from Evolution API upstream versions.

> **Historical upstream record:** Entries beginning at `2.3.7` below are retained from the selected Evolution API upstream base for provenance only. They are not Nova Era API releases.

## [Unreleased]

## [0.2.0-alpha.2] - 2026-11-03

### Added

- **Dedicated Instance Workspace & Real-time Chat in Nova Era Manager:**
  - Dedicated instance workspace matching upstream Evolution Manager workflow (`#instance/:instanceName`).
  - Instance hero with profile picture, connection status, number/JID details, and quick action bar.
  - Tabbed conversation list with support for Contacts, Groups, and modern `@lid` JIDs.
  - Instant conversation search, message previews, unread badges, and 15-second background refresh.
  - Chronological message history with date separators, ephemeral/view-once text extraction, and direct message composer.
- **Authenticated Proxy Configuration in Nova Era Manager:**
  - Full proxy configuration supporting optional username and password credentials across HTTP, HTTPS, SOCKS4, and SOCKS5.
  - Safe credential management: passwords are submitted only via protected session/CSRF requests and are never reflected back to browser storage or API responses.
- **Enhanced Connection & QR Code Lifecycle:**
  - Pre-connection verification: connected instances (`open`) immediately show connection confirmation without attempting QR generation or starting unnecessary polling loops.
  - Active QR code polling while the connection modal is open, with automatic detection when WhatsApp connects.
  - Manual `↻ Atualizar QR` refresh button to renew expired QR codes.

### Fixed

- Fixed `Cannot read properties of null (reading 'enabled')` error when viewing proxy settings on instances without stored proxy configuration.
- Fixed QR code rendering failure caused by rigid nested object parsing on Baileys connection responses.
- Fixed recipient JID handling for `@lid` and group messaging.

## [0.2.0-alpha.1] - 2026-10-30

### Added

- New Nova Era channel route `POST /webhook/nova-era`.
- New Nova Era Bot route family `/novaEraBot/*` (`create`, `find`, `fetch/:novaEraBotId`, `update/:novaEraBotId`, `delete/:novaEraBotId`, `settings`, `fetchSettings`, `changeStatus`, `fetchSessions/:novaEraBotId`, `ignoreJid`).
- New database migrations for PostgreSQL and MySQL renaming bot tables, constraints, instance integrations and session types to Nova Era API names.
- Migration runbook in `docs/operations/RUNBOOK_0.2.0_BREAKING_MIGRATION.md`.
- Independently developed Nova Era Manager at `/manager/`, included in the Docker image, with secure server-side sessions, instance operations, creation, settings, webhook, proxy and Chatwoot configuration.

### Changed

- **Breaking:** Removed legacy channel route `/webhook/evolution` (now returns 404).
- **Breaking:** Removed legacy chatbot route family `/evolutionBot/*` (now returns 404).
- **Breaking:** Removed `Integration.EVOLUTION` enum; instance creation now accepts `Integration.NOVA_ERA` (`NOVA_ERA`) and rejects legacy `EVOLUTION` values with 400.
- **Breaking:** Renamed Prisma models and physical tables `EvolutionBot` -> `NovaEraBot` and `EvolutionBotSetting` -> `NovaEraBotSetting`.
- **Breaking:** Migrated integration session types from `evolution` to `nova-era`.
- Renamed the local foundation identity, package metadata, default infrastructure identifiers, documentation and public assets to Nova Era API. Existing persistent deployments require an explicit data/session migration before adopting the new Docker resource names.
- Renamed Prometheus metrics from the `evolution_` prefix to `nova_era_api_`; update dashboards, alerts, recording rules and scrape job names with the documented migration.
- Renamed defaults emitted to Kafka, SQS, S3/MinIO and webhook JWT consumers; Meta webhook verification now requires an explicitly configured token. See the external identifier migration guide before cutover.

### Security

- Backported the upstream authorization fix from commit `7a55a2bfcca5bff7df48a76893398d7b5aed5d56` that prevents query/body input from overriding an authenticated route instance identity.
- Removed a temporary per-message cache debug log from the Baileys channel to avoid unnecessary operational log noise.
- Removed the Chatwoot SDK's nested vulnerable `axios@0.27.2`; the internal client rejects absolute custom paths and redirect responses before credentials can be sent to another origin.
- Centralized image conversion with malformed-image rejection and a 40-megapixel processing limit for JPEG, sticker WebP and thumbnail paths.
- Validated image, static sticker and animated sticker delivery through an authorized WhatsApp test device after the Sharp upgrade.
- Hardened link preview generation against SSRF, loopback, private RFC1918/ULA ranges, cloud metadata, and DNS rebinding; added package override `socks: "2.8.10"` resolving `ip-address@10.7.5` outside advisory ranges.
- Manager sessions use HttpOnly, Secure, SameSite=Strict sliding cookies, with a 30-day expiry renewed during authenticated activity.

### Compatibility

- HTTP route paths, event identifiers, upstream database migration history and externally meaningful environment variable names are retained unless documented otherwise.

### Provenance

- Base: Evolution API `2.3.7`, commit `cd800f2976e1e5b682fbf86a01ee4d85ae61f370`.

[Unreleased]: https://github.com/caiocn/nova-era-api/compare/v0.2.0-alpha.2...HEAD
[0.2.0-alpha.2]: https://github.com/caiocn/nova-era-api/compare/v0.2.0-alpha.1...v0.2.0-alpha.2
[0.2.0-alpha.1]: https://github.com/caiocn/nova-era-api/releases/tag/v0.2.0-alpha.1
