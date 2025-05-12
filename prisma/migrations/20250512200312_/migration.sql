-- AlterTable
ALTER TABLE `schools` ADD COLUMN `logo` JSON NULL,
    ADD COLUMN `subscription_id` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `users` ADD COLUMN `avatar` JSON NULL;

-- CreateTable
CREATE TABLE `subscriptions` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `student_limit` INTEGER NULL,
    `duration` INTEGER NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `subscriptions_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `schools` ADD CONSTRAINT `schools_subscription_id_fkey` FOREIGN KEY (`subscription_id`) REFERENCES `subscriptions`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
