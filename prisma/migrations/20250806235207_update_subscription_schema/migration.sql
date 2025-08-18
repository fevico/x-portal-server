/*
  Warnings:

  - You are about to drop the column `description` on the `subscriptions` table. All the data in the column will be lost.
  - You are about to drop the column `isPopular` on the `subscriptions` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `subscriptions` DROP COLUMN `description`,
    DROP COLUMN `isPopular`,
    MODIFY `amount` INTEGER NULL,
    MODIFY `studentLimit` INTEGER NULL,
    MODIFY `duration` INTEGER NULL,
    MODIFY `features` JSON NULL,
    MODIFY `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    MODIFY `updated_at` DATETIME(3) NULL;
