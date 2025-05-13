-- AlterTable
ALTER TABLE `permissions` ADD COLUMN `scope` ENUM('platform', 'school') NOT NULL DEFAULT 'school';
