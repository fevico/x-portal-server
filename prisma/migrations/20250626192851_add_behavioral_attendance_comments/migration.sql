-- AlterTable
ALTER TABLE `student_score_assignments` ADD COLUMN `attendance_absent` INTEGER NULL,
    ADD COLUMN `attendance_present` INTEGER NULL,
    ADD COLUMN `attendance_total` INTEGER NULL,
    ADD COLUMN `attentiveness` ENUM('excellent', 'very_good', 'good', 'fair', 'poor') NULL,
    ADD COLUMN `class_teacher_comment` TEXT NULL,
    ADD COLUMN `leadership_skills` ENUM('excellent', 'very_good', 'good', 'fair', 'poor') NULL,
    ADD COLUMN `neatness` ENUM('excellent', 'very_good', 'good', 'fair', 'poor') NULL,
    ADD COLUMN `principal_comment` TEXT NULL,
    ADD COLUMN `punctuality` ENUM('excellent', 'very_good', 'good', 'fair', 'poor') NULL;
