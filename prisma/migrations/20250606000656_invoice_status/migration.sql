-- AlterTable
ALTER TABLE `invoices` ADD COLUMN `status` ENUM('submitted', 'paid', 'overdue', 'cancelled') NOT NULL DEFAULT 'submitted';
