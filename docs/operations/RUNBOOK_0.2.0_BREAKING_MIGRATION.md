# Nova Era API 0.2.0-alpha.1 Breaking Migration Runbook

**Target version:** `0.2.0-alpha.1`
**Policy:** Strict breaking cutover without backwards-compatibility aliases.
**Applicability:** Deployments upgrading from `0.1.0-alpha.1` (or legacy upstream databases) to `0.2.0-alpha.1`.

---

## 1. Summary of Breaking Changes

| Layer | Legacy Identifier | Nova Era Identifier | Cutover Behavior |
|---|---|---|---|
| **Instance Integration** | `EVOLUTION` | `NOVA_ERA` | `Integration.EVOLUTION` removed. New instances with `EVOLUTION` return `400 Bad Request`. Existing database rows are migrated to `NOVA_ERA`. |
| **Channel Webhook** | `POST /webhook/evolution` | `POST /webhook/nova-era` | Legacy route removed; returns `404 Not Found`. |
| **Chatbot Route Family** | `/evolutionBot/*` | `/novaEraBot/*` | Legacy routes removed; return `404 Not Found`. Route param is `:novaEraBotId`. |
| **Prisma Models** | `EvolutionBot`, `EvolutionBotSetting` | `NovaEraBot`, `NovaEraBotSetting` | Renamed with explicit `@@map("NovaEraBot")` and `@@map("NovaEraBotSetting")`. |
| **Database Tables** | `EvolutionBot`, `EvolutionBotSetting` | `NovaEraBot`, `NovaEraBotSetting` | Renamed in-place via migrations with constraints and unique indexes preserved. |
| **Integration Session Type** | `type = 'evolution'` | `type = 'nova-era'` | Existing integration session records migrated in-place. |

---

## 2. Pre-requisites & Backup

Before starting the upgrade, create full backups of the database, cache, and session storage:

### PostgreSQL Backup
```bash
pg_dump -h <HOST> -U <USER> -Fc -d <DATABASE_NAME> > backup_pre_0.2.0_$(date +%Y%m%d%H%M%S).dump
```

### MySQL Backup
```bash
mysqldump -h <HOST> -u <USER> -p --single-transaction --quick <DATABASE_NAME> > backup_pre_0.2.0_$(date +%Y%m%d%H%M%S).sql
```

### Redis Snapshot & Volume Backup
```bash
# If Redis persistence is enabled:
redis-cli BGSAVE

# Session volume backup (Docker example):
docker run --rm -v nova-era-api-rc14-live-instances:/data -v $(pwd):/backup alpine tar czf /backup/instances_backup.tar.gz -C /data .
```

---

## 3. Database Inventory Check

Run the following queries against your database to review existing legacy records:

### PostgreSQL
```sql
SELECT COUNT(*) FROM "Instance" WHERE "integration" = 'EVOLUTION';
SELECT COUNT(*) FROM "IntegrationSession" WHERE "type" = 'evolution';
SELECT COUNT(*) FROM "EvolutionBot";
SELECT COUNT(*) FROM "EvolutionBotSetting";
```

### MySQL
```sql
SELECT COUNT(*) FROM `Instance` WHERE `integration` = 'EVOLUTION';
SELECT COUNT(*) FROM `IntegrationSession` WHERE `type` = 'evolution';
SELECT COUNT(*) FROM `EvolutionBot`;
SELECT COUNT(*) FROM `EvolutionBotSetting`;
```

---

## 4. Applying the Database Migration

Run the database deployment command with the matching database provider configured:

### PostgreSQL / PgBouncer
```bash
export DATABASE_PROVIDER=postgresql # or psql_bouncer
export DATABASE_CONNECTION_URI="postgresql://user:password@host:5432/database?schema=public"
npm run db:deploy
```

### MySQL
```bash
export DATABASE_PROVIDER=mysql
export DATABASE_CONNECTION_URI="mysql://user:password@host:3306/database"
npm run db:deploy
```

The migration `20261026190000_rename_nova_era_bot`:
1. Renames tables `EvolutionBot` -> `NovaEraBot` and `EvolutionBotSetting` -> `NovaEraBotSetting`.
2. Renames primary keys, foreign keys, and unique indexes to `NovaEraBot*`.
3. Updates `Instance.integration = 'NOVA_ERA'` where it was `'EVOLUTION'`.
4. Updates `IntegrationSession.type = 'nova-era'` where it was `'evolution'`.

---

## 5. Runtime Deployment & Validation

1. Deploy the `0.2.0-alpha.1` container image or restart with updated application code.
2. Verify liveness endpoint:
   ```bash
   curl -f http://localhost:8080/health
   ```
3. Verify active WhatsApp instance state:
   ```bash
   curl -H "apikey: <GLOBAL_OR_INSTANCE_KEY>" http://localhost:8080/instance/connectionState/<INSTANCE_NAME>
   # Expected: {"instance":{"instanceName":"<INSTANCE_NAME>","state":"open"}}
   ```
4. Verify cutover routes:
   ```bash
   # New channel webhook responds 200
   curl -X POST http://localhost:8080/webhook/nova-era -H "Content-Type: application/json" -d '{}'

   # Old channel webhook returns 404
   curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:8080/webhook/evolution
   # Expected: 404

   # Old bot endpoint returns 404
   curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8080/evolutionBot/find/<INSTANCE_NAME>
   # Expected: 404
   ```

---

## 6. Rollback Procedure

Because the cutover intentionally does not maintain aliases or reverse SQL migrations, rollbacks are performed via snapshot restore:

1. Stop the `0.2.0-alpha.1` container / process.
2. Restore the database from the pre-migration snapshot:
   - **PostgreSQL:**
     ```bash
     pg_restore -h <HOST> -U <USER> -d <DATABASE_NAME> --clean --if-exists backup_pre_0.2.0_*.dump
     ```
   - **MySQL:**
     ```bash
     mysql -h <HOST> -u <USER> -p <DATABASE_NAME> < backup_pre_0.2.0_*.sql
     ```
3. Restore session data if files were modified:
   ```bash
   docker run --rm -v nova-era-api-rc14-live-instances:/data -v $(pwd):/backup alpine sh -c "rm -rf /data/* && tar xzf /backup/instances_backup.tar.gz -C /data"
   ```
4. Restart the retained `0.1.0-alpha.1` container image.
5. Verify instance connection status returns to `open`.
