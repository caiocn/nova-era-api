-- Some legacy installations never created these optional bot tables. Guard every
-- rename so the breaking cutover remains safe for both database shapes.
DO $$
BEGIN
  IF to_regclass('"EvolutionBot"') IS NOT NULL THEN
    ALTER TABLE "EvolutionBot" RENAME TO "NovaEraBot";
  END IF;

  IF to_regclass('"EvolutionBotSetting"') IS NOT NULL THEN
    ALTER TABLE "EvolutionBotSetting" RENAME TO "NovaEraBotSetting";
  END IF;

  IF to_regclass('"NovaEraBot"') IS NOT NULL
    AND EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'EvolutionBot_pkey') THEN
    ALTER TABLE "NovaEraBot" RENAME CONSTRAINT "EvolutionBot_pkey" TO "NovaEraBot_pkey";
  END IF;

  IF to_regclass('"NovaEraBotSetting"') IS NOT NULL
    AND EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'EvolutionBotSetting_pkey') THEN
    ALTER TABLE "NovaEraBotSetting" RENAME CONSTRAINT "EvolutionBotSetting_pkey" TO "NovaEraBotSetting_pkey";
  END IF;

  IF to_regclass('"EvolutionBotSetting_instanceId_key"') IS NOT NULL THEN
    ALTER INDEX "EvolutionBotSetting_instanceId_key" RENAME TO "NovaEraBotSetting_instanceId_key";
  END IF;

  IF to_regclass('"NovaEraBot"') IS NOT NULL
    AND EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'EvolutionBot_instanceId_fkey') THEN
    ALTER TABLE "NovaEraBot" RENAME CONSTRAINT "EvolutionBot_instanceId_fkey" TO "NovaEraBot_instanceId_fkey";
  END IF;

  IF to_regclass('"NovaEraBotSetting"') IS NOT NULL
    AND EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'EvolutionBotSetting_botIdFallback_fkey') THEN
    ALTER TABLE "NovaEraBotSetting"
      RENAME CONSTRAINT "EvolutionBotSetting_botIdFallback_fkey" TO "NovaEraBotSetting_botIdFallback_fkey";
  END IF;

  IF to_regclass('"NovaEraBotSetting"') IS NOT NULL
    AND EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'EvolutionBotSetting_instanceId_fkey') THEN
    ALTER TABLE "NovaEraBotSetting"
      RENAME CONSTRAINT "EvolutionBotSetting_instanceId_fkey" TO "NovaEraBotSetting_instanceId_fkey";
  END IF;
END $$;

-- Migrate persisted legacy identifiers as part of the same breaking cutover.
UPDATE "Instance"
SET "integration" = 'NOVA_ERA'
WHERE "integration" = 'EVOLUTION';

UPDATE "IntegrationSession"
SET "type" = 'nova-era'
WHERE "type" = 'evolution';
