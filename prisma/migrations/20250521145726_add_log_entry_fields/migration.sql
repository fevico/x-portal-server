-- AlterTable
ALTER TABLE `log_entries` ADD COLUMN `device` VARCHAR(191) NULL,
    ADD COLUMN `ip_address` VARCHAR(191) NULL,
    ADD COLUMN `location` VARCHAR(191) NULL;
