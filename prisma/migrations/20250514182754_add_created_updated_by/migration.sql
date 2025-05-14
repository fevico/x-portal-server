-- AlterTable
ALTER TABLE `parents` ADD COLUMN `created_by` VARCHAR(191) NULL,
    ADD COLUMN `updated_by` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `permissions` ADD COLUMN `created_by` VARCHAR(191) NULL,
    ADD COLUMN `updated_by` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `schools` ADD COLUMN `createdBy` VARCHAR(191) NULL,
    ADD COLUMN `updatedBy` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `staff` ADD COLUMN `created_by` VARCHAR(191) NULL,
    ADD COLUMN `updated_by` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `students` ADD COLUMN `created_by` VARCHAR(191) NULL,
    ADD COLUMN `updated_by` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `sub_role_permissions` ADD COLUMN `created_by` VARCHAR(191) NULL,
    ADD COLUMN `updated_by` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `sub_roles` ADD COLUMN `created_by` VARCHAR(191) NULL,
    ADD COLUMN `updated_by` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `subscriptions` ADD COLUMN `created_by` VARCHAR(191) NULL,
    ADD COLUMN `updated_by` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `users` ADD COLUMN `created_by` VARCHAR(191) NULL,
    ADD COLUMN `updated_by` VARCHAR(191) NULL,
    MODIFY `firstname` VARCHAR(191) NULL,
    MODIFY `lastname` VARCHAR(191) NULL;
