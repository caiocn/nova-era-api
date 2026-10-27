-- Some legacy installations never created these optional bot tables. Use dynamic
-- SQL so the cutover is safe whether the legacy tables exist or not.
SET @schema_name = DATABASE();
SET @evolution_bot_exists = (
  SELECT COUNT(*) FROM information_schema.tables
  WHERE table_schema = @schema_name AND table_name = 'EvolutionBot'
);
SET @nova_era_bot_exists = (
  SELECT COUNT(*) FROM information_schema.tables
  WHERE table_schema = @schema_name AND table_name = 'NovaEraBot'
);
SET @rename_evolution_bot = IF(
  @evolution_bot_exists = 1 AND @nova_era_bot_exists = 0,
  'RENAME TABLE `EvolutionBot` TO `NovaEraBot`',
  'SELECT 1'
);
PREPARE statement FROM @rename_evolution_bot;
EXECUTE statement;
DEALLOCATE PREPARE statement;

SET @evolution_bot_setting_exists = (
  SELECT COUNT(*) FROM information_schema.tables
  WHERE table_schema = @schema_name AND table_name = 'EvolutionBotSetting'
);
SET @nova_era_bot_setting_exists = (
  SELECT COUNT(*) FROM information_schema.tables
  WHERE table_schema = @schema_name AND table_name = 'NovaEraBotSetting'
);
SET @rename_evolution_bot_setting = IF(
  @evolution_bot_setting_exists = 1 AND @nova_era_bot_setting_exists = 0,
  'RENAME TABLE `EvolutionBotSetting` TO `NovaEraBotSetting`',
  'SELECT 1'
);
PREPARE statement FROM @rename_evolution_bot_setting;
EXECUTE statement;
DEALLOCATE PREPARE statement;

SET @nova_era_bot_exists = (
  SELECT COUNT(*) FROM information_schema.tables
  WHERE table_schema = @schema_name AND table_name = 'NovaEraBot'
);
SET @nova_era_bot_setting_exists = (
  SELECT COUNT(*) FROM information_schema.tables
  WHERE table_schema = @schema_name AND table_name = 'NovaEraBotSetting'
);

SET @drop_evolution_bot_fk = IF(
  @nova_era_bot_exists = 1
  AND EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = @schema_name
      AND table_name = 'NovaEraBot'
      AND constraint_name = 'EvolutionBot_instanceId_fkey'
  ),
  'ALTER TABLE `NovaEraBot` DROP FOREIGN KEY `EvolutionBot_instanceId_fkey`',
  'SELECT 1'
);
PREPARE statement FROM @drop_evolution_bot_fk;
EXECUTE statement;
DEALLOCATE PREPARE statement;

SET @drop_evolution_bot_setting_fallback_fk = IF(
  @nova_era_bot_setting_exists = 1
  AND EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = @schema_name
      AND table_name = 'NovaEraBotSetting'
      AND constraint_name = 'EvolutionBotSetting_botIdFallback_fkey'
  ),
  'ALTER TABLE `NovaEraBotSetting` DROP FOREIGN KEY `EvolutionBotSetting_botIdFallback_fkey`',
  'SELECT 1'
);
PREPARE statement FROM @drop_evolution_bot_setting_fallback_fk;
EXECUTE statement;
DEALLOCATE PREPARE statement;

SET @drop_evolution_bot_setting_instance_fk = IF(
  @nova_era_bot_setting_exists = 1
  AND EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = @schema_name
      AND table_name = 'NovaEraBotSetting'
      AND constraint_name = 'EvolutionBotSetting_instanceId_fkey'
  ),
  'ALTER TABLE `NovaEraBotSetting` DROP FOREIGN KEY `EvolutionBotSetting_instanceId_fkey`',
  'SELECT 1'
);
PREPARE statement FROM @drop_evolution_bot_setting_instance_fk;
EXECUTE statement;
DEALLOCATE PREPARE statement;

SET @rename_evolution_bot_setting_index = IF(
  @nova_era_bot_setting_exists = 1
  AND EXISTS (
    SELECT 1 FROM information_schema.statistics
    WHERE table_schema = @schema_name
      AND table_name = 'NovaEraBotSetting'
      AND index_name = 'EvolutionBotSetting_instanceId_key'
  ),
  'ALTER TABLE `NovaEraBotSetting` RENAME INDEX `EvolutionBotSetting_instanceId_key` TO `NovaEraBotSetting_instanceId_key`',
  'SELECT 1'
);
PREPARE statement FROM @rename_evolution_bot_setting_index;
EXECUTE statement;
DEALLOCATE PREPARE statement;

SET @add_nova_era_bot_fk = IF(
  @nova_era_bot_exists = 1
  AND NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = @schema_name
      AND table_name = 'NovaEraBot'
      AND constraint_name = 'NovaEraBot_instanceId_fkey'
  ),
  'ALTER TABLE `NovaEraBot` ADD CONSTRAINT `NovaEraBot_instanceId_fkey` FOREIGN KEY (`instanceId`) REFERENCES `Instance`(`id`) ON DELETE CASCADE ON UPDATE CASCADE',
  'SELECT 1'
);
PREPARE statement FROM @add_nova_era_bot_fk;
EXECUTE statement;
DEALLOCATE PREPARE statement;

SET @add_nova_era_bot_setting_fallback_fk = IF(
  @nova_era_bot_setting_exists = 1
  AND NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = @schema_name
      AND table_name = 'NovaEraBotSetting'
      AND constraint_name = 'NovaEraBotSetting_botIdFallback_fkey'
  ),
  'ALTER TABLE `NovaEraBotSetting` ADD CONSTRAINT `NovaEraBotSetting_botIdFallback_fkey` FOREIGN KEY (`botIdFallback`) REFERENCES `NovaEraBot`(`id`) ON DELETE SET NULL ON UPDATE CASCADE',
  'SELECT 1'
);
PREPARE statement FROM @add_nova_era_bot_setting_fallback_fk;
EXECUTE statement;
DEALLOCATE PREPARE statement;

SET @add_nova_era_bot_setting_instance_fk = IF(
  @nova_era_bot_setting_exists = 1
  AND NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = @schema_name
      AND table_name = 'NovaEraBotSetting'
      AND constraint_name = 'NovaEraBotSetting_instanceId_fkey'
  ),
  'ALTER TABLE `NovaEraBotSetting` ADD CONSTRAINT `NovaEraBotSetting_instanceId_fkey` FOREIGN KEY (`instanceId`) REFERENCES `Instance`(`id`) ON DELETE CASCADE ON UPDATE CASCADE',
  'SELECT 1'
);
PREPARE statement FROM @add_nova_era_bot_setting_instance_fk;
EXECUTE statement;
DEALLOCATE PREPARE statement;

-- Migrate persisted legacy identifiers as part of the same breaking cutover.
UPDATE `Instance` SET `integration` = 'NOVA_ERA' WHERE `integration` = 'EVOLUTION';
UPDATE `IntegrationSession` SET `type` = 'nova-era' WHERE `type` = 'evolution';
