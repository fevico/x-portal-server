/*
  Warnings:

  - You are about to drop the column `attendance_absent` on the `student_score_assignments` table. All the data in the column will be lost.
  - You are about to drop the column `attendance_present` on the `student_score_assignments` table. All the data in the column will be lost.
  - You are about to drop the column `attendance_total` on the `student_score_assignments` table. All the data in the column will be lost.
  - You are about to drop the column `attentiveness` on the `student_score_assignments` table. All the data in the column will be lost.
  - You are about to drop the column `class_teacher_comment` on the `student_score_assignments` table. All the data in the column will be lost.
  - You are about to drop the column `leadership_skills` on the `student_score_assignments` table. All the data in the column will be lost.
  - You are about to drop the column `neatness` on the `student_score_assignments` table. All the data in the column will be lost.
  - You are about to drop the column `principal_comment` on the `student_score_assignments` table. All the data in the column will be lost.
  - You are about to drop the column `punctuality` on the `student_score_assignments` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `student_score_assignments` DROP COLUMN `attendance_absent`,
    DROP COLUMN `attendance_present`,
    DROP COLUMN `attendance_total`,
    DROP COLUMN `attentiveness`,
    DROP COLUMN `class_teacher_comment`,
    DROP COLUMN `leadership_skills`,
    DROP COLUMN `neatness`,
    DROP COLUMN `principal_comment`,
    DROP COLUMN `punctuality`;

-- CreateTable
CREATE TABLE `student_term_records` (
    `id` VARCHAR(191) NOT NULL,
    `student_id` VARCHAR(191) NOT NULL,
    `class_id` VARCHAR(191) NOT NULL,
    `class_arm_id` VARCHAR(191) NOT NULL,
    `session_id` VARCHAR(191) NOT NULL,
    `term_definition_id` VARCHAR(191) NOT NULL,
    `school_id` VARCHAR(191) NOT NULL,
    `unique_hash` VARCHAR(64) NOT NULL,
    `punctuality` ENUM('excellent', 'very_good', 'good', 'fair', 'poor') NULL,
    `attentiveness` ENUM('excellent', 'very_good', 'good', 'fair', 'poor') NULL,
    `leadership_skills` ENUM('excellent', 'very_good', 'good', 'fair', 'poor') NULL,
    `neatness` ENUM('excellent', 'very_good', 'good', 'fair', 'poor') NULL,
    `attendance_total` INTEGER NULL,
    `attendance_present` INTEGER NULL,
    `attendance_absent` INTEGER NULL,
    `class_teacher_comment` TEXT NULL,
    `principal_comment` TEXT NULL,
    `recorded_by` VARCHAR(191) NOT NULL,
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL,
    `created_by` VARCHAR(191) NULL,
    `updated_by` VARCHAR(191) NULL,

    UNIQUE INDEX `student_term_records_unique_hash_key`(`unique_hash`),
    INDEX `student_term_records_school_id_student_id_session_id_term_de_idx`(`school_id`, `student_id`, `session_id`, `term_definition_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `student_term_records` ADD CONSTRAINT `student_term_records_student_id_fkey` FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `student_term_records` ADD CONSTRAINT `student_term_records_class_id_fkey` FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `student_term_records` ADD CONSTRAINT `student_term_records_class_arm_id_fkey` FOREIGN KEY (`class_arm_id`) REFERENCES `class_arms`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `student_term_records` ADD CONSTRAINT `student_term_records_session_id_fkey` FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `student_term_records` ADD CONSTRAINT `student_term_records_term_definition_id_fkey` FOREIGN KEY (`term_definition_id`) REFERENCES `term_definitions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `student_term_records` ADD CONSTRAINT `student_term_records_school_id_fkey` FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
