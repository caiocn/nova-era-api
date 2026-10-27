# Changelog

All notable Nova Era API changes will be recorded here. The project follows [Semantic Versioning](https://semver.org/); Nova Era API versions are independent from Evolution API upstream versions.

> **Historical upstream record:** Entries beginning at `2.3.7` below are retained from the selected Evolution API upstream base for provenance only. They are not Nova Era API releases.

## [Unreleased]

### Added

- New Nova Era channel route `POST /webhook/nova-era`.
- New Nova Era Bot route family `/novaEraBot/*` (`create`, `find`, `fetch/:novaEraBotId`, `update/:novaEraBotId`, `delete/:novaEraBotId`, `settings`, `fetchSettings`, `changeStatus`, `fetchSessions/:novaEraBotId`, `ignoreJid`).
- New database migrations for PostgreSQL and MySQL renaming bot tables, constraints, instance integrations and session types to Nova Era API names.
- Migration runbook in `docs/operations/RUNBOOK_0.2.0_BREAKING_MIGRATION.md`.

### Changed

- **Breaking:** Removed legacy channel route `/webhook/evolution` (now returns 404).
- **Breaking:** Removed legacy chatbot route family `/evolutionBot/*` (now returns 404).
- **Breaking:** Removed `Integration.EVOLUTION` enum; instance creation now accepts `Integration.NOVA_ERA` (`NOVA_ERA`) and rejects legacy `EVOLUTION` values with 400.
- **Breaking:** Renamed Prisma models and physical tables `EvolutionBot` -> `NovaEraBot` and `EvolutionBotSetting` -> `NovaEraBotSetting`.
- **Breaking:** Migrated integration session types from `evolution` to `nova-era`.
- Renamed the local foundation identity, package metadata, default infrastructure identifiers, documentation and public assets to Nova Era API. Existing persistent deployments require an explicit data/session migration before adopting the new Docker resource names.
- Renamed Prometheus metrics from the `evolution_` prefix to `nova_era_api_`; update dashboards, alerts, recording rules and scrape job names with the documented migration.
- Renamed defaults emitted to Kafka, SQS, S3/MinIO and webhook JWT consumers; Meta webhook verification now requires an explicitly configured token. See the external identifier migration guide before cutover.

### Planned

- Complete acceptance checks for the first alpha release.

## [0.1.0-alpha.1] - planned

### Added

- Foundation documentation, governance templates, compatibility inventory and maintenance process.
- Local health endpoint at `GET /health`.
- Initial compatibility regression tests for route instance identity and health response data.

### Changed

- Project package metadata, Docker image references and default non-protocol identifiers use Nova Era API branding.
- Docker Compose provides self-hosted PostgreSQL and Redis services with persistent volumes and health checks.
- Upstream Manager artifacts and protected Evolution visual assets are excluded pending a separate legal and technical review.
- Upgraded the WhatsApp channel from `baileys@7.0.0-rc.9` to `7.0.0-rc14`, including `jimp@1.6.1` for its peer dependency and `whatsapp-rust-bridge@0.5.5` to retain CommonJS loading on Node 22.
- Restored the `/instance/create` contract so the client-supplied instance name is accepted while the server continues to generate and protect the instance ID.
- Replaced the unmaintained Figuro Chatwoot SDK with an internal compatibility client backed by the direct Axios dependency; Chatwoot routes, configuration and payload contracts remain unchanged.
- Upgraded Sharp to `0.35.5`, replaced the Chatwoot Jimp thumbnail path with Sharp, and omitted Baileys' optional Jimp peer from the production install.
- Upgraded `link-preview-js` to `5.0.1`, made link preview generation opt-in (`linkPreview: true`), and moved `tsup` to `devDependencies`.
- Upgraded Prisma to `7.10.1` (`prisma`, `@prisma/client`, `@prisma/adapter-pg`, `@prisma/adapter-mariadb`, `pg@8.16.3`), added root `prisma.config.ts`, and updated `PrismaRepository` to select driver adapters dynamically per `DATABASE_PROVIDER`.
- Upgraded OpenAI SDK to `7.43.0` and adapted Assistants API `runs.retrieve` and `runs.submitToolOutputs` call signatures for v7 compatibility.

### Security

- Backported the upstream authorization fix from commit `7a55a2bfcca5bff7df48a76893398d7b5aed5d56` that prevents query/body input from overriding an authenticated route instance identity.
- Removed a temporary per-message cache debug log from the Baileys channel to avoid unnecessary operational log noise.
- Removed the Chatwoot SDK's nested vulnerable `axios@0.27.2`; the internal client rejects absolute custom paths and redirect responses before credentials can be sent to another origin.
- Centralized image conversion with malformed-image rejection and a 40-megapixel processing limit for JPEG, sticker WebP and thumbnail paths.
- Validated image, static sticker and animated sticker delivery through an authorized WhatsApp test device after the Sharp upgrade.
- Hardened link preview generation against SSRF, loopback, private RFC1918/ULA ranges, cloud metadata, and DNS rebinding; added package override `socks: "2.8.10"` resolving `ip-address@10.7.5` outside advisory ranges.

### Compatibility

- HTTP route paths, event identifiers, upstream database migration history and externally meaningful environment variable names are retained unless documented otherwise.

### Provenance

- Base: Evolution API `2.3.7`, commit `cd800f2976e1e5b682fbf86a01ee4d85ae61f370`.

[Unreleased]: https://github.com/caiocn/nova-era-api/compare/v0.1.0-alpha.1...HEAD
[0.1.0-alpha.1]: https://github.com/caiocn/nova-era-api/releases/tag/v0.1.0-alpha.1
