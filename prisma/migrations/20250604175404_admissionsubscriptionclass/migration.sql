/*
  Warnings:

  - You are about to drop the `school_subscriptions` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `school_subscriptions` DROP FOREIGN KEY `school_subscriptions_school_id_fkey`;

-- DropForeignKey
ALTER TABLE `school_subscriptions` DROP FOREIGN KEY `school_subscriptions_subscription_id_fkey`;

-- AlterTable
ALTER TABLE `schools` ADD COLUMN `subscription_expires_at` DATETIME(3) NULL,
    ADD COLUMN `subscription_status` BOOLEAN NULL DEFAULT false;

-- DropTable
DROP TABLE `school_subscriptions`;

-- CreateTable
CREATE TABLE `SubscriptionPayment` (
    `id` VARCHAR(191) NOT NULL,
    `school_id` VARCHAR(191) NOT NULL,
    `subscription_id` VARCHAR(191) NOT NULL,
    `amount` DOUBLE NOT NULL,
    `reference` VARCHAR(191) NOT NULL,
    `payment_method` VARCHAR(191) NULL,
    `paymentStatus` ENUM('pending', 'success', 'failed') NOT NULL DEFAULT 'pending',
    `payment_date` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `SubscriptionPayment` ADD CONSTRAINT `SubscriptionPayment_school_id_fkey` FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SubscriptionPayment` ADD CONSTRAINT `SubscriptionPayment_subscription_id_fkey` FOREIGN KEY (`subscription_id`) REFERENCES `subscriptions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
