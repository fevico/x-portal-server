/*
  Warnings:

  - You are about to drop the column `first_term_end` on the `sessions` table. All the data in the column will be lost.
  - You are about to drop the column `first_term_start` on the `sessions` table. All the data in the column will be lost.
  - You are about to drop the column `second_term_end` on the `sessions` table. All the data in the column will be lost.
  - You are about to drop the column `second_term_start` on the `sessions` table. All the data in the column will be lost.
  - You are about to drop the column `third_term_end` on the `sessions` table. All the data in the column will be lost.
  - You are about to drop the column `third_term_start` on the `sessions` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `schools` ADD COLUMN `current_session_id` VARCHAR(191) NULL,
    ADD COLUMN `current_term_id` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `sessions` DROP COLUMN `first_term_end`,
    DROP COLUMN `first_term_start`,
    DROP COLUMN `second_term_end`,
    DROP COLUMN `second_term_start`,
    DROP COLUMN `third_term_end`,
    DROP COLUMN `third_term_start`;

-- CreateTable
CREATE TABLE `terms` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `start_date` DATETIME(3) NOT NULL,
    `end_date` DATETIME(3) NOT NULL,
    `session_id` VARCHAR(191) NOT NULL,
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by` VARCHAR(191) NULL,
    `updated_by` VARCHAR(191) NULL,

    UNIQUE INDEX `terms_name_session_id_key`(`name`, `session_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `schools` ADD CONSTRAINT `schools_current_session_id_fkey` FOREIGN KEY (`current_session_id`) REFERENCES `sessions`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `schools` ADD CONSTRAINT `schools_current_term_id_fkey` FOREIGN KEY (`current_term_id`) REFERENCES `terms`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `terms` ADD CONSTRAINT `terms_session_id_fkey` FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
