/*
  Warnings:

  - You are about to alter the column `status` on the `student_invoice_assignments` table. The data in that column could be lost. The data in that column will be cast from `Enum(EnumId(3))` to `Enum(EnumId(10))`.

*/
-- AlterTable
ALTER TABLE `student_invoice_assignments` MODIFY `status` ENUM('paid', 'unpaid', 'partial') NOT NULL DEFAULT 'unpaid';
