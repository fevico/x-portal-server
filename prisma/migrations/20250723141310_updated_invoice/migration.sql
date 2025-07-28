/*
  Warnings:

  - Added the required column `paymentEvidence` to the `invoices` table without a default value. This is not possible if the table is not empty.
  - Added the required column `session_id` to the `invoices` table without a default value. This is not possible if the table is not empty.
  - Added the required column `term_id` to the `invoices` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `invoices` ADD COLUMN `paymentEvidence` JSON NOT NULL,
    ADD COLUMN `session_id` VARCHAR(191) NOT NULL,
    ADD COLUMN `term_id` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `students` ADD COLUMN `year_of_graduation` DATETIME(3) NULL;

-- AddForeignKey
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_term_id_fkey` FOREIGN KEY (`term_id`) REFERENCES `term_definitions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_session_id_fkey` FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
