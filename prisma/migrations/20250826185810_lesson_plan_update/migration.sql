/*
  Warnings:

  - You are about to drop the column `date` on the `LessonPlan` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `LessonPlan` DROP COLUMN `date`,
    MODIFY `period` VARCHAR(50) NULL,
    MODIFY `duration` VARCHAR(50) NULL,
    MODIFY `status` ENUM('PENDING', 'APPROVED', 'REJECTED', 'DRAFT') NOT NULL DEFAULT 'PENDING';
