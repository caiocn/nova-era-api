-- MySQL table renames preserve the existing rows and unique index definitions.
RENAME TABLE `EvolutionBot` TO `NovaEraBot`,
  `EvolutionBotSetting` TO `NovaEraBotSetting`;

-- Foreign-key constraint names cannot be renamed in MySQL, so recreate them.
ALTER TABLE `NovaEraBot` DROP FOREIGN KEY `EvolutionBot_instanceId_fkey`;
ALTER TABLE `NovaEraBotSetting` DROP FOREIGN KEY `EvolutionBotSetting_botIdFallback_fkey`;
ALTER TABLE `NovaEraBotSetting` DROP FOREIGN KEY `EvolutionBotSetting_instanceId_fkey`;
ALTER TABLE `NovaEraBotSetting`
  RENAME INDEX `EvolutionBotSetting_instanceId_key` TO `NovaEraBotSetting_instanceId_key`;

ALTER TABLE `NovaEraBot`
  ADD CONSTRAINT `NovaEraBot_instanceId_fkey`
  FOREIGN KEY (`instanceId`) REFERENCES `Instance`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `NovaEraBotSetting`
  ADD CONSTRAINT `NovaEraBotSetting_botIdFallback_fkey`
  FOREIGN KEY (`botIdFallback`) REFERENCES `NovaEraBot`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `NovaEraBotSetting`
  ADD CONSTRAINT `NovaEraBotSetting_instanceId_fkey`
  FOREIGN KEY (`instanceId`) REFERENCES `Instance`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Migrate persisted legacy identifiers as part of the same breaking cutover.
UPDATE `Instance` SET `integration` = 'NOVA_ERA' WHERE `integration` = 'EVOLUTION';
UPDATE `IntegrationSession` SET `type` = 'nova-era' WHERE `type` = 'evolution';
