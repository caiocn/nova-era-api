import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';

const rootDir = process.cwd();
const schemaFiles = ['postgresql-schema.prisma', 'mysql-schema.prisma', 'psql_bouncer-schema.prisma'];

test('exposes Nova Era bot Prisma models in every database schema', async () => {
  for (const schemaFile of schemaFiles) {
    const schema = await readFile(join(rootDir, 'prisma', schemaFile), 'utf8');

    assert.match(schema, /model NovaEraBot \{/);
    assert.match(schema, /model NovaEraBotSetting \{/);
    assert.match(schema, /NovaEraBot\s+NovaEraBot\[\]/);
    assert.match(schema, /NovaEraBotSetting\s+NovaEraBotSetting\?/);
    assert.match(schema, /Fallback\s+NovaEraBot\?\s+@relation\(fields: \[botIdFallback\], references: \[id\]\)/);
    assert.match(schema, /@@map\("NovaEraBot"\)/);
    assert.match(schema, /@@map\("NovaEraBotSetting"\)/);
    assert.doesNotMatch(schema, /model EvolutionBot/);
    assert.doesNotMatch(schema, /model EvolutionBotSetting/);
  }
});

test('conditionally renames legacy bot tables and persisted integration identities in PostgreSQL', async () => {
  const migration = await readFile(
    join(rootDir, 'prisma', 'postgresql-migrations', '20261026190000_rename_nova_era_bot', 'migration.sql'),
    'utf8',
  );

  assert.match(migration, /IF to_regclass\('"EvolutionBot"'\) IS NOT NULL THEN/);
  assert.match(migration, /ALTER TABLE "EvolutionBot" RENAME TO "NovaEraBot";/);
  assert.match(migration, /IF to_regclass\('"EvolutionBotSetting"'\) IS NOT NULL THEN/);
  assert.match(migration, /ALTER TABLE "EvolutionBotSetting" RENAME TO "NovaEraBotSetting";/);
  assert.match(migration, /RENAME CONSTRAINT "EvolutionBot_pkey" TO "NovaEraBot_pkey"/);
  assert.match(
    migration,
    /SET "integration" = 'NOVA_ERA'\s+WHERE "integration" = 'EVOLUTION';/,
  );
  assert.match(migration, /SET "type" = 'nova-era'\s+WHERE "type" = 'evolution';/);
});

test('conditionally renames legacy bot tables and recreates renamed foreign keys in MySQL', async () => {
  const migration = await readFile(
    join(rootDir, 'prisma', 'mysql-migrations', '20261026190000_rename_nova_era_bot', 'migration.sql'),
    'utf8',
  );

  assert.match(migration, /@evolution_bot_exists = 1 AND @nova_era_bot_exists = 0/);
  assert.match(migration, /RENAME TABLE `EvolutionBot` TO `NovaEraBot`/);
  assert.match(migration, /@evolution_bot_setting_exists = 1 AND @nova_era_bot_setting_exists = 0/);
  assert.match(migration, /RENAME TABLE `EvolutionBotSetting` TO `NovaEraBotSetting`/);
  assert.match(migration, /DROP FOREIGN KEY `EvolutionBotSetting_botIdFallback_fkey`/);
  assert.match(
    migration,
    /RENAME INDEX `EvolutionBotSetting_instanceId_key` TO `NovaEraBotSetting_instanceId_key`/,
  );
  assert.match(migration, /ADD CONSTRAINT `NovaEraBotSetting_botIdFallback_fkey`\s+FOREIGN KEY/);
  assert.match(migration, /UPDATE `Instance` SET `integration` = 'NOVA_ERA' WHERE `integration` = 'EVOLUTION';/);
  assert.match(migration, /UPDATE `IntegrationSession` SET `type` = 'nova-era' WHERE `type` = 'evolution';/);
});
