/*
  Warnings:

  - You are about to drop the column `class_id` on the `invoices` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `invoices` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE `invoices` DROP FOREIGN KEY `invoices_class_id_fkey`;

-- DropIndex
DROP INDEX `invoices_class_id_fkey` ON `invoices`;

-- AlterTable
ALTER TABLE `invoices` DROP COLUMN `class_id`,
    DROP COLUMN `type`,
    ADD COLUMN `invoiceType` ENUM('single', 'mass') NOT NULL DEFAULT 'single';

-- CreateTable
CREATE TABLE `invoice_class_assignments` (
    `id` VARCHAR(191) NOT NULL,
    `invoice_id` VARCHAR(191) NOT NULL,
    `class_id` VARCHAR(191) NOT NULL,
    `school_id` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `invoice_class_assignments_school_id_invoice_id_idx`(`school_id`, `invoice_id`),
    UNIQUE INDEX `invoice_class_assignments_invoice_id_class_id_key`(`invoice_id`, `class_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `invoice_class_assignments` ADD CONSTRAINT `invoice_class_assignments_invoice_id_fkey` FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoice_class_assignments` ADD CONSTRAINT `invoice_class_assignments_class_id_fkey` FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoice_class_assignments` ADD CONSTRAINT `invoice_class_assignments_school_id_fkey` FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
