/*
  Warnings:

  - You are about to alter the column `qualifications` on the `staff` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Json`.

*/
-- AlterTable
ALTER TABLE `parents` ADD COLUMN `is_deleted` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `staff` ADD COLUMN `is_deleted` BOOLEAN NOT NULL DEFAULT false,
    MODIFY `qualifications` JSON NULL;
