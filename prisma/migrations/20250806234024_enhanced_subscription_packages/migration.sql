/*
  Warnings:

  - Made the column `amount` on table `subscriptions` required. This step will fail if there are existing NULL values in that column.
  - Made the column `studentLimit` on table `subscriptions` required. This step will fail if there are existing NULL values in that column.
  - Made the column `duration` on table `subscriptions` required. This step will fail if there are existing NULL values in that column.
  - Made the column `features` on table `subscriptions` required. This step will fail if there are existing NULL values in that column.
  - Made the column `created_at` on table `subscriptions` required. This step will fail if there are existing NULL values in that column.
  - Made the column `updated_at` on table `subscriptions` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE `subscriptions` ADD COLUMN `description` VARCHAR(191) NULL,
    ADD COLUMN `isPopular` BOOLEAN NOT NULL DEFAULT false,
    MODIFY `amount` DOUBLE NOT NULL,
    MODIFY `studentLimit` INTEGER NOT NULL,
    MODIFY `duration` INTEGER NOT NULL,
    MODIFY `features` JSON NOT NULL,
    MODIFY `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    MODIFY `updated_at` DATETIME(3) NOT NULL;
