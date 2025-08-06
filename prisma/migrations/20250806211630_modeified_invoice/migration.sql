/*
  Warnings:

  - You are about to drop the column `due_date` on the `invoices` table. All the data in the column will be lost.
  - You are about to drop the column `issued_date` on the `invoices` table. All the data in the column will be lost.
  - You are about to drop the column `outstanding` on the `invoices` table. All the data in the column will be lost.
  - You are about to drop the column `paid` on the `invoices` table. All the data in the column will be lost.
  - You are about to drop the column `paymentEvidence` on the `invoices` table. All the data in the column will be lost.
  - You are about to drop the column `payment_receipt` on the `invoices` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `invoices` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `invoices` DROP COLUMN `due_date`,
    DROP COLUMN `issued_date`,
    DROP COLUMN `outstanding`,
    DROP COLUMN `paid`,
    DROP COLUMN `paymentEvidence`,
    DROP COLUMN `payment_receipt`,
    DROP COLUMN `status`,
    ADD COLUMN `isDeleted` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `type` ENUM('single', 'mass') NOT NULL DEFAULT 'single';
