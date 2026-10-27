-- Rename the legacy bot tables without altering their data or relation semantics.
ALTER TABLE "EvolutionBot" RENAME TO "NovaEraBot";
ALTER TABLE "EvolutionBotSetting" RENAME TO "NovaEraBotSetting";

-- Keep constraint and index names aligned with the new physical table names.
ALTER TABLE "NovaEraBot" RENAME CONSTRAINT "EvolutionBot_pkey" TO "NovaEraBot_pkey";
ALTER TABLE "NovaEraBotSetting" RENAME CONSTRAINT "EvolutionBotSetting_pkey" TO "NovaEraBotSetting_pkey";
ALTER INDEX "EvolutionBotSetting_instanceId_key" RENAME TO "NovaEraBotSetting_instanceId_key";
ALTER TABLE "NovaEraBot" RENAME CONSTRAINT "EvolutionBot_instanceId_fkey" TO "NovaEraBot_instanceId_fkey";
ALTER TABLE "NovaEraBotSetting"
  RENAME CONSTRAINT "EvolutionBotSetting_botIdFallback_fkey" TO "NovaEraBotSetting_botIdFallback_fkey";
ALTER TABLE "NovaEraBotSetting"
  RENAME CONSTRAINT "EvolutionBotSetting_instanceId_fkey" TO "NovaEraBotSetting_instanceId_fkey";

-- Migrate persisted legacy identifiers as part of the same breaking cutover.
UPDATE "Instance"
SET "integration" = 'NOVA_ERA'
WHERE "integration" = 'EVOLUTION';

UPDATE "IntegrationSession"
SET "type" = 'nova-era'
WHERE "type" = 'evolution';
