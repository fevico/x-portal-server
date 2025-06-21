/*
  Warnings:

  - The values [mid,terminal] on the enum `result_batches_resultScope` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `department` on the `staff` table. All the data in the column will be lost.
  - You are about to drop the column `position` on the `staff` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `result_batches` MODIFY `resultScope` ENUM('CA', 'EXAM') NOT NULL;

-- AlterTable
ALTER TABLE `staff` DROP COLUMN `department`,
    DROP COLUMN `position`;
