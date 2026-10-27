# Baileys Maintenance Strategy

## Current baseline

| Item | Value |
| --- | --- |
| Package | `baileys` |
| Selected version | `7.0.0-rc14` |
| CommonJS bridge override | `whatsapp-rust-bridge@0.5.5` |
| Main integration | `src/api/integrations/channel/whatsapp/whatsapp.baileys.service.ts` |
| Socket construction | `makeWASocket` |
| Version lookup | `src/utils/fetchLatestWaWebVersion.ts` via `fetchLatestBaileysVersion` |
| Credentials | Prisma, Redis DB or provider-files state utilities |
| QR and pairing | Baileys channel service and instance lifecycle |

Baileys is an unofficial WhatsApp Web implementation. WhatsApp can change protocols or enforce platform policies without notice. Nova Era API must not promise account safety, delivery guarantees or immunity from restrictions, and must not implement controls intended to bypass platform protections.

## rc14 validation record — 2026-10-25

The upgrade from `7.0.0-rc.9` to `7.0.0-rc14` resolves the package graph to `libsignal@6.0.0` and `protobufjs@7.6.6`. The explicit bridge override is required because the rc14-pinned `whatsapp-rust-bridge@0.5.4` cannot be loaded through this CommonJS application on Node 22 (`ERR_PACKAGE_PATH_NOT_EXPORTED`); `0.5.5` supplies the required CommonJS export.

An isolated local stack (Node 22 image, disposable PostgreSQL and Redis) was validated against an authorized WhatsApp test account. The test used a dedicated instance and never stored the QR image, API key, recipient number, credential payloads, or message content in the repository.

| Check | Result |
| --- | --- |
| Image package inspection | Passed: Baileys `7.0.0-rc14`, bridge `0.5.5`, `makeWASocket` and bridge key API load in CommonJS |
| Prisma migration and API health | Passed on a disposable PostgreSQL database |
| Instance lifecycle | Passed: create, `connectionState`, delete in isolated stack |
| QR pairing and credential persistence | Passed: the paired instance reached `open`; one Prisma session and Redis auth keys were persisted |
| Outbound text | Passed to an authorized recipient |
| Outbound PNG image | Passed to the same recipient |
| Inbound text | Passed: an authorized reply was persisted as an inbound conversation message |
| Restart/reconnect | Passed: endpoint restart returned the paired instance to `open` without a new QR scan |

The initial history synchronization emitted expected update warnings for messages not stored in the freshly created database. A transient Baileys `stream:error` code `515` was also observed during the forced restart; the automatic reconnection returned the paired instance to `open` without a new QR scan. Neither event prevented text/media/inbound/restart verification. The temporary `CACHE` debug log emitted for every message update was removed after this test because it created noisy operational logs.

The complete manual matrix is still not exhaustive: pairing-code, logout/re-link, multi-instance isolation, group and `@lid` sends, PTT, polls and interactive messages require separate authorized test cases. This upgrade is validated for the recorded baseline flows, not a general guarantee for unsupported WhatsApp behavior.

## Integration points to protect

1. Instance creation and isolated credential state.
2. QR code and pairing-code generation.
3. Connection update lifecycle, reconnection and logout cleanup.
4. `messages.upsert`, message status, contacts, chats, groups, calls and presence events.
5. Sending text, media, reactions, polls and interactive message forms already supported by the selected base.
6. JID normalization, especially `@lid`, group and broadcast JIDs.
7. Redis/Prisma credential serialization and deserialization.
8. Chatwoot, Typebot, n8n and other consumers of Baileys message types.

## Upgrade policy

Do not run a blanket package update. An upgrade is a dedicated change with a release note, an isolated branch and a rollback plan.

1. Monitor Baileys releases, advisories and upstream Evolution API changes weekly.
2. Read Baileys migration notes and inspect the full package lockfile diff.
3. Compare Evolution upstream's upgrade/patch approach. For example, upstream later considered `7.0.0-rc.10` with an additional package patch; this is evidence to evaluate, not a drop-in update.
4. Update only Baileys and directly required compatibility code in one change.
5. Run unit/contract tests, isolated PostgreSQL/Redis integration tests and authorized manual device tests.
6. Document package version, WhatsApp Web version, device setup, outcomes and unresolved failures.
7. Publish an alpha/beta build before declaring an upgrade supported.

## Regression suite proposal

### CI-safe tests (no WhatsApp account)

- Unit-test JID normalization and payload transformation fixtures.
- Test validation, unauthorized/unknown instance response shape and per-instance route identity.
- Test credential serialization through in-memory fakes.
- Contract-test event names and representative JSON payloads.
- Test retry/backoff calculations with fake timers.
- Test that a failed channel dependency does not expose credentials in HTTP errors or logs.

### Local integration tests

Use ephemeral PostgreSQL and Redis containers:

- Instance row lifecycle and client-name isolation.
- Redis credential key lifecycle through logout and reconnection cleanup.
- Prisma migration deploy/rollback preparation on a disposable database.
- Webhook dispatch mock with success, timeout and retry paths.

### Authorized manual test matrix

These tests need dedicated test accounts/devices and are never run in public CI:

| Scenario | Evidence to capture |
| --- | --- |
| First QR scan | sanitized instance state and QR expiry behavior |
| Pairing code | success/failure response without secrets |
| Text and media send | message ID, status transition and received event |
| Inbound message | expected webhook/event payload fixture |
| Restart/reconnect | session resumes without duplicate event handlers |
| Logout/re-link | old credential state is removed; fresh scan works |
| Multi-instance | events and credentials remain isolated |
| `@lid` / group JIDs | expected lookup/send behavior under a documented WhatsApp version |

No test account, phone number, QR code image or auth credential belongs in Git, CI logs or issue reports.

## Monitoring and response

- Track connection failure reason distributions and reconnect loops without logging credentials/content.
- Subscribe to Baileys release/advisory channels and upstream release notes.
- When WhatsApp protocol changes cause failures, first reproduce with an authorized isolated device; do not attempt evasion.
- Triage a compatibility incident with a minimal fixture, a version matrix and rollback guidance.

## Acceptance rule

An upgrade is not considered validated merely because TypeScript builds or a socket opens. It needs the documented regression evidence appropriate to the changed surface.
