/*
  Warnings:

  - Made the column `school_id` on table `configurations` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE `configurations` DROP FOREIGN KEY `configurations_school_id_fkey`;

-- AlterTable
ALTER TABLE `configurations` MODIFY `school_id` VARCHAR(191) NOT NULL;

-- AddForeignKey
ALTER TABLE `configurations` ADD CONSTRAINT `configurations_school_id_fkey` FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
