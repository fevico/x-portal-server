/*
  Warnings:

  - You are about to drop the column `status` on the `invoices` table. All the data in the column will be lost.
  - Added the required column `school_id` to the `class_categories` table without a default value. This is not possible if the table is not empty.
  - Made the column `reference` on table `invoices` required. This step will fail if there are existing NULL values in that column.
  - Made the column `issued_date` on table `invoices` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE `class_categories` ADD COLUMN `school_id` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `invoices` DROP COLUMN `status`,
    MODIFY `reference` VARCHAR(191) NOT NULL,
    MODIFY `issued_date` DATETIME(3) NOT NULL;

-- AddForeignKey
ALTER TABLE `class_categories` ADD CONSTRAINT `class_categories_school_id_fkey` FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
