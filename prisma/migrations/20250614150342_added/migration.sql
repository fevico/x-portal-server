/*
  Warnings:

  - You are about to drop the column `session_term_id` on the `student_score_assignments` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[student_id,subject_id,session_id,term_definition_id]` on the table `student_score_assignments` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `term_definition_id` to the `student_score_assignments` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `student_score_assignments` DROP FOREIGN KEY `student_score_assignments_school_id_fkey`;

-- DropForeignKey
ALTER TABLE `student_score_assignments` DROP FOREIGN KEY `student_score_assignments_session_term_id_fkey`;

-- DropForeignKey
ALTER TABLE `student_score_assignments` DROP FOREIGN KEY `student_score_assignments_student_id_fkey`;

-- DropIndex
DROP INDEX `student_score_assignments_school_id_student_id_session_id_se_idx` ON `student_score_assignments`;

-- DropIndex
DROP INDEX `student_score_assignments_session_term_id_fkey` ON `student_score_assignments`;

-- DropIndex
DROP INDEX `student_score_assignments_student_id_subject_id_session_id_s_key` ON `student_score_assignments`;

-- AlterTable
ALTER TABLE `student_score_assignments` DROP COLUMN `session_term_id`,
    ADD COLUMN `term_definition_id` VARCHAR(191) NOT NULL;

-- CreateIndex
CREATE INDEX `student_score_assignments_school_id_student_id_session_id_te_idx` ON `student_score_assignments`(`school_id`, `student_id`, `session_id`, `term_definition_id`);

-- CreateIndex
CREATE UNIQUE INDEX `student_score_assignments_student_id_subject_id_session_id_t_key` ON `student_score_assignments`(`student_id`, `subject_id`, `session_id`, `term_definition_id`);

-- AddForeignKey
-- ALTER TABLE `TeacherSubjectAssignment` ADD CONSTRAINT `TeacherSubjectAssignment_school_id_fkey` FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
-- ALTER TABLE `student_score_assignments` ADD CONSTRAINT `student_score_assignments_subject_id_fkey` FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `student_score_assignments` ADD CONSTRAINT `student_score_assignments_term_definition_id_fkey` FOREIGN KEY (`term_definition_id`) REFERENCES `term_definitions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
