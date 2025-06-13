/*
  Warnings:

  - You are about to alter the column `school_head_signature` on the `configurations` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Json`.
  - You are about to alter the column `principal_signature` on the `configurations` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Json`.
  - You are about to alter the column `bursar_signature` on the `configurations` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Json`.

*/
-- AlterTable
ALTER TABLE `configurations` MODIFY `school_head_signature` JSON NULL,
    MODIFY `principal_signature` JSON NULL,
    MODIFY `bursar_signature` JSON NULL;
