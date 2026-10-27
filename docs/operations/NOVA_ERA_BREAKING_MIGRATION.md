# Nova Era Breaking Migration Design

**Status:** `APPROVED FOR IMPLEMENTATION`
**Decision date:** 2026-10-26
**Target version:** `0.2.0-alpha.1`
**Scope:** Legacy Evolution channel and EvolutionBot identity removal. This is a technical migration design, not a trademark-clearance opinion.

## Objective

Remove the remaining upstream product identity from active channel and chatbot contracts while preserving their functional behavior under Nova Era API names.

The release is intentionally breaking. It replaces, rather than aliases, the legacy route paths, integration value, Prisma model names, database table names and integration-session type. This prevents the released runtime from continuing to present or emit the prior product identity.

## Decisions

| Legacy surface | Nova Era replacement | Cutover behavior |
| --- | --- | --- |
| `Integration.EVOLUTION` / `EVOLUTION` | `Integration.NOVA_ERA` / `NOVA_ERA` | Existing instance records are updated in the database migration; new legacy values are rejected. |
| `/webhook/evolution` | `/webhook/nova-era` | Old route is removed and returns `404`. |
| `channel/evolution` modules | `channel/nova-era` modules | Internal rename only; functional channel behavior is preserved. |
| `/evolutionBot/*` | `/novaEraBot/*` | Old route family is removed and returns `404`. |
| `:evolutionBotId` | `:novaEraBotId` | Parameter name changes with the new route family. |
| `EvolutionBot` | `NovaEraBot` | Physical PostgreSQL/MySQL table rename preserves IDs and data. |
| `EvolutionBotSetting` | `NovaEraBotSetting` | Physical table/constraint rename preserves settings and fallback references. |
| `IntegrationSession.type = "evolution"` | `IntegrationSession.type = "nova-era"` | Existing bot sessions are updated in the migration. |

The bot's request and response payload fields remain unchanged: `apiUrl`, `apiKey`, trigger settings, fallback ID and chatbot session behavior keep their current meaning.

## Explicit non-goals

- Do not rewrite historical migrations containing legacy table names.
- Do not retain `/evolutionBot`, `/webhook/evolution` or `EVOLUTION` compatibility aliases.
- Do not alter the Baileys or Meta channel contracts.
- Do not remove legal/provenance references to Evolution API from `LICENSE`, `NOTICE` or legal documentation.
- Do not deploy the migration against a database without a tested backup and isolated rehearsal.

## Current baseline

The isolated Nova Era validation database was inspected on 2026-10-26:

```text
EvolutionBot records:                 0
EvolutionBotSetting records:          0
IntegrationSession type = evolution:  0
Instance integration = EVOLUTION:     0
```

This makes the local test stack a low-risk rehearsal environment. Production or operator databases must still be treated as having active legacy data until inventoried.

## Database migration design

### Prisma schema target

All three Prisma schemas must expose these model and relation names:

```prisma
model Instance {
  // Existing relations omitted
  NovaEraBot        NovaEraBot[]
  NovaEraBotSetting NovaEraBotSetting?
}

model NovaEraBot {
  // Existing EvolutionBot fields are unchanged
  NovaEraBotSetting NovaEraBotSetting[]

  @@map("NovaEraBot")
}

model NovaEraBotSetting {
  // Existing EvolutionBotSetting fields are unchanged
  Fallback NovaEraBot? @relation(fields: [botIdFallback], references: [id])

  @@map("NovaEraBotSetting")
}
```

The explicit `@@map` declarations make the physical database names intentional. The generated Prisma client exposes `novaEraBot` and `novaEraBotSetting` repositories.

### PostgreSQL migration

A new migration under `prisma/postgresql-migrations/` must:

1. Rename `"EvolutionBot"` to `"NovaEraBot"`.
2. Rename `"EvolutionBotSetting"` to `"NovaEraBotSetting"`.
3. Rename the primary-key, unique-index and foreign-key constraint identifiers from `EvolutionBot*` to `NovaEraBot*`.
4. Update all `"Instance"."integration" = 'EVOLUTION'` values to `'NOVA_ERA'`.
5. Update all `"IntegrationSession"."type" = 'evolution'` values to `'nova-era'`.

The constraint names created by the historical migration must be renamed, not dropped without replacement:

```text
EvolutionBot_pkey                         → NovaEraBot_pkey
EvolutionBotSetting_pkey                  → NovaEraBotSetting_pkey
EvolutionBotSetting_instanceId_key        → NovaEraBotSetting_instanceId_key
EvolutionBot_instanceId_fkey              → NovaEraBot_instanceId_fkey
EvolutionBotSetting_botIdFallback_fkey    → NovaEraBotSetting_botIdFallback_fkey
EvolutionBotSetting_instanceId_fkey       → NovaEraBotSetting_instanceId_fkey
```

### MySQL migration

A new migration under `prisma/mysql-migrations/` must:

1. Rename `EvolutionBot` to `NovaEraBot` and `EvolutionBotSetting` to `NovaEraBotSetting`.
2. Rename the unique index and recreate foreign keys under `NovaEraBot*` names when MySQL cannot rename a foreign-key identifier directly.
3. Update `Instance.integration` from `EVOLUTION` to `NOVA_ERA`.
4. Update `IntegrationSession.type` from `evolution` to `nova-era`.

The exact SQL must be tested on MySQL 8 with records for bots, settings, fallback references and sessions. It must not rely on PostgreSQL-specific `ALTER TABLE ... RENAME CONSTRAINT` syntax.

### PgBouncer

`DATABASE_PROVIDER=psql_bouncer` deliberately uses the PostgreSQL migration tree through `runWithProvider.js`. It therefore receives the tested PostgreSQL migration without a duplicate migration directory.

### Rollback policy

There is no reverse migration in the runtime release path. Roll back by restoring a verified pre-migration database snapshot and deploying the retained prior image. This matches the existing Prisma 7 image-based rollback policy.

## Runtime migration design

### Nova Era channel

| Current module | Replacement module |
| --- | --- |
| `channel/evolution/evolution.channel.service.ts` | `channel/nova-era/nova-era.channel.service.ts` |
| `EvolutionStartupService` | `NovaEraStartupService` |
| `EvolutionController` | `NovaEraController` |
| `EvolutionRouter` | `NovaEraRouter` |
| `evolutionController` | `novaEraController` |

`ChannelController.init()` selects `Integration.NOVA_ERA`. The new route accepts the same webhook body at `POST /webhook/nova-era`; only the route and integration identity change.

### Nova Era Bot

| Current module | Replacement module |
| --- | --- |
| `chatbot/evolutionBot/` | `chatbot/nova-era-bot/` |
| `EvolutionBotDto` | `NovaEraBotDto` |
| `EvolutionBotSettingDto` | `NovaEraBotSettingDto` |
| `EvolutionBotController` | `NovaEraBotController` |
| `EvolutionBotService` | `NovaEraBotService` |
| `evolutionBotController` | `novaEraBotController` |
| `evolutionBotSchema` | `novaEraBotSchema` |

The new router is mounted at `/novaEraBot`. It preserves the existing endpoint verbs and payload fields while replacing path parameters with `:novaEraBotId`.

All sessions created by this bot use `type: "nova-era"`. Bot logs, duplicate messages and error messages use `Nova Era Bot` wording.

## Release contract

### New paths

```text
POST /webhook/nova-era

POST   /novaEraBot/create/:instanceName
GET    /novaEraBot/find/:instanceName
GET    /novaEraBot/fetch/:novaEraBotId/:instanceName
PUT    /novaEraBot/update/:novaEraBotId/:instanceName
DELETE /novaEraBot/delete/:novaEraBotId/:instanceName
POST   /novaEraBot/settings/:instanceName
GET    /novaEraBot/fetchSettings/:instanceName
POST   /novaEraBot/changeStatus/:instanceName
GET    /novaEraBot/fetchSessions/:novaEraBotId/:instanceName
POST   /novaEraBot/ignoreJid/:instanceName
```

### Removed paths and values

```text
/webhook/evolution
/evolutionBot/*
EVOLUTION
```

Removed paths must be absent from the router and return the standard `404` response. New instance creation requests carrying `integration: "EVOLUTION"` must fail validation with `400`.

## Implementation plan

### Task 1 — Schema and provider migrations

**Files:** three Prisma schemas; one new PostgreSQL migration; one new MySQL migration.
**Acceptance:** new Prisma Client names are present; physical tables, constraints, instance integrations and session types migrate without data loss.
**Verify:** generate Prisma clients for PostgreSQL, MySQL and PgBouncer; apply migrations to disposable databases with seeded legacy records.

### Task 2 — Nova Era channel rename

**Files:** integration enum, channel modules, module wiring and channel route contract test.
**Acceptance:** `NOVA_ERA` and `/webhook/nova-era` work; old channel route and value are removed.
**Verify:** isolated HTTP contract tests plus existing full test/build suite.

### Task 3 — Nova Era Bot rename

**Files:** bot modules, DTOs, schemas, router, service wiring and bot route contract test.
**Acceptance:** `/novaEraBot/*` provides the existing bot behavior and session type; old bot route is absent.
**Verify:** contract tests with injected controller; Prisma CRUD against migrated seeded data.

### Task 4 — Rehearsal and release documentation

**Files:** compatibility/release notes and migration runbook.
**Acceptance:** operators have exact backup, migration, validation and image-based rollback instructions.
**Verify:** restore a safe copy, migrate both provider types, compare row counts and foreign keys, then validate an authorized Baileys instance is still `open`.

## Quality gates

Every implementation task must keep the project buildable and run:

```bash
DATABASE_PROVIDER=postgresql npm run db:generate
DATABASE_PROVIDER=mysql npm run db:generate
DATABASE_PROVIDER=psql_bouncer npm run db:generate
npm test
npm run lint:check
NODE_OPTIONS=--max-old-space-size=4096 npm run build
```

Before cutover, run PostgreSQL and MySQL migration rehearsals over a safe copy containing representative legacy records. Do not use a live WhatsApp account for channel or bot migration testing without separate authorization.

## Boundaries

- **Always:** preserve migration history, create new provider-specific migrations, use safe copies, validate the new route family and scan the final runtime for active legacy identity.
- **Ask first:** changing the approved no-alias policy, changing the target version, retaining any legacy route, or applying migrations to a non-test database.
- **Never:** edit historical Prisma migrations, delete old data before a verified backup, commit credentials or sessions, or use a production broker/S3/Meta account as a test target.
