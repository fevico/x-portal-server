-- /*
--   Warnings:

--   - You are about to drop the column `term_id` on the `student_class_assignments` table. All the data in the column will be lost.
--   - A unique constraint covering the columns `[student_id,session_id,school_id]` on the table `student_class_assignments` will be added. If there are existing duplicate values, this will fail.

-- */
-- -- DropForeignKey
ALTER TABLE `student_class_assignments` DROP FOREIGN KEY `student_class_assignments_student_id_fkey`;

-- DropForeignKey
ALTER TABLE `student_class_assignments` DROP FOREIGN KEY `student_class_assignments_term_id_fkey`;

-- DropIndex
DROP INDEX `student_class_assignments_student_id_session_id_term_id_idx` ON `student_class_assignments`;

-- DropIndex
DROP INDEX `student_class_assignments_student_id_session_id_term_id_scho_key` ON `student_class_assignments`;

-- DropIndex
DROP INDEX `student_class_assignments_term_id_fkey` ON `student_class_assignments`;

-- AlterTable
ALTER TABLE `student_class_assignments` DROP COLUMN `term_id`;

-- CreateIndex
CREATE INDEX `student_class_assignments_student_id_session_id_idx` ON `student_class_assignments`(`student_id`, `session_id`);

-- CreateIndex
CREATE UNIQUE INDEX `student_class_assignments_student_id_session_id_school_id_key` ON `student_class_assignments`(`student_id`, `session_id`, `school_id`);

-- AddForeignKey
ALTER TABLE `attendances` ADD CONSTRAINT `attendances_term_id_fkey` FOREIGN KEY (`term_id`) REFERENCES `terms`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;


/*
  Warnings:

  - The `term_id` column on the `student_class_assignments` table will be made nullable. Existing data will be preserved.
  - A unique constraint covering the columns `[student_id,session_id,school_id]` on the table `student_class_assignments` will be added. If there are existing duplicate values, this will fail.

*/
-- -- DropForeignKey
-- ALTER TABLE `student_class_assignments` DROP CONSTRAINT `student_class_assignments_student_id_fkey`;

-- -- DropForeignKey
-- ALTER TABLE `student_class_assignments` DROP CONSTRAINT `student_class_assignments_term_id_fkey`;

-- -- DropIndex
-- DROP INDEX `student_class_assignments_student_id_session_id_term_id_idx` ON `student_class_assignments`;

-- -- AlterTable
-- ALTER TABLE `student_class_assignments` MODIFY COLUMN `term_id` VARCHAR(191) NULL;

-- -- CreateIndex
-- CREATE INDEX `student_class_assignments_student_id_session_id_idx` ON `student_class_assignments` (`student_id`, `session_id`);

-- -- CreateIndex
-- CREATE UNIQUE INDEX `student_class_assignments_student_id_session_id_school_id_key` ON `student_class_assignments` (`student_id`, `session_id`, `school_id`);

-- -- AddForeignKey
-- ALTER TABLE `student_class_assignments` ADD CONSTRAINT `student_class_assignments_student_id_fkey` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- -- AddForeignKey
-- ALTER TABLE `student_class_assignments` ADD CONSTRAINT `student_class_assignments_term_id_fkey` FOREIGN KEY (`term_id`) REFERENCES `terms` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;