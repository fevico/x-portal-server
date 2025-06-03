/*
  Warnings:

  - You are about to drop the column `isAdmitted` on the `admissions` table. All the data in the column will be lost.
  - You are about to drop the column `category` on the `classes` table. All the data in the column will be lost.
  - You are about to drop the column `staff_id` on the `staff` table. All the data in the column will be lost.
  - You are about to drop the column `isAdmitted` on the `students` table. All the data in the column will be lost.
  - You are about to drop the column `student_id` on the `students` table. All the data in the column will be lost.
  - You are about to drop the `class_class_arms` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `class_subjects` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[staff_reg_no]` on the table `staff` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[student_reg_no]` on the table `students` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE `class_class_arms` DROP FOREIGN KEY `class_class_arms_class_arm_id_fkey`;

-- DropForeignKey
ALTER TABLE `class_class_arms` DROP FOREIGN KEY `class_class_arms_class_id_fkey`;

-- DropForeignKey
ALTER TABLE `class_class_arms` DROP FOREIGN KEY `class_class_arms_school_id_fkey`;

-- DropForeignKey
ALTER TABLE `class_subjects` DROP FOREIGN KEY `class_subjects_class_id_fkey`;

-- DropForeignKey
ALTER TABLE `class_subjects` DROP FOREIGN KEY `class_subjects_school_id_fkey`;

-- DropForeignKey
ALTER TABLE `class_subjects` DROP FOREIGN KEY `class_subjects_subject_id_fkey`;

-- DropIndex
DROP INDEX `staff_staff_id_key` ON `staff`;

-- DropIndex
DROP INDEX `students_student_id_key` ON `students`;

-- AlterTable
ALTER TABLE `admissions` DROP COLUMN `isAdmitted`,
    ADD COLUMN `admission_date` DATETIME(3) NULL,
    ADD COLUMN `admission_status` ENUM('pending', 'accepted', 'rejected') NOT NULL DEFAULT 'pending',
    ADD COLUMN `image_url` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `classes` DROP COLUMN `category`,
    ADD COLUMN `class_category_id` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `staff` DROP COLUMN `staff_id`,
    ADD COLUMN `staff_reg_no` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `student_subjects` ADD COLUMN `classClassArmSubjectId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `students` DROP COLUMN `isAdmitted`,
    DROP COLUMN `student_id`,
    ADD COLUMN `admission_status` ENUM('pending', 'accepted', 'rejected') NOT NULL DEFAULT 'pending',
    ADD COLUMN `student_reg_no` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `subscriptions` ADD COLUMN `amount` INTEGER NULL;

-- DropTable
DROP TABLE `class_class_arms`;

-- DropTable
DROP TABLE `class_subjects`;

-- CreateTable
CREATE TABLE `class_categories` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by` VARCHAR(191) NULL,
    `updated_by` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `class_class_arm_subjects` (
    `id` VARCHAR(191) NOT NULL,
    `class_id` VARCHAR(191) NOT NULL,
    `class_arm_id` VARCHAR(191) NOT NULL,
    `subject_id` VARCHAR(191) NOT NULL,
    `school_id` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by` VARCHAR(191) NULL,
    `updated_by` VARCHAR(191) NULL,

    UNIQUE INDEX `class_class_arm_subjects_class_id_class_arm_id_subject_id_sc_key`(`class_id`, `class_arm_id`, `subject_id`, `school_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `attendances` (
    `id` VARCHAR(191) NOT NULL,
    `student_id` VARCHAR(191) NOT NULL,
    `school_id` VARCHAR(191) NOT NULL,
    `session_id` VARCHAR(191) NOT NULL,
    `term_id` VARCHAR(191) NOT NULL,
    `class_id` VARCHAR(191) NOT NULL,
    `class_arm_id` VARCHAR(191) NOT NULL,
    `status` ENUM('present', 'absent', 'late') NOT NULL DEFAULT 'present',
    `date` DATETIME(3) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by` VARCHAR(191) NULL,
    `updated_by` VARCHAR(191) NULL,

    INDEX `attendances_student_id_date_idx`(`student_id`, `date`),
    INDEX `attendances_school_id_session_id_term_id_idx`(`school_id`, `session_id`, `term_id`),
    UNIQUE INDEX `attendances_student_id_date_school_id_session_id_term_id_key`(`student_id`, `date`, `school_id`, `session_id`, `term_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `student_class_assignments` (
    `id` VARCHAR(191) NOT NULL,
    `student_id` VARCHAR(191) NOT NULL,
    `session_id` VARCHAR(191) NOT NULL,
    `term_id` VARCHAR(191) NOT NULL,
    `class_id` VARCHAR(191) NOT NULL,
    `class_arm_id` VARCHAR(191) NOT NULL,
    `school_id` VARCHAR(191) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by` VARCHAR(191) NULL,
    `updated_by` VARCHAR(191) NULL,

    INDEX `student_class_assignments_student_id_session_id_term_id_idx`(`student_id`, `session_id`, `term_id`),
    INDEX `student_class_assignments_class_id_class_arm_id_school_id_idx`(`class_id`, `class_arm_id`, `school_id`),
    UNIQUE INDEX `student_class_assignments_student_id_session_id_term_id_scho_key`(`student_id`, `session_id`, `term_id`, `school_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `staff_staff_reg_no_key` ON `staff`(`staff_reg_no`);

-- CreateIndex
CREATE UNIQUE INDEX `students_student_reg_no_key` ON `students`(`student_reg_no`);

-- AddForeignKey
ALTER TABLE `classes` ADD CONSTRAINT `classes_class_category_id_fkey` FOREIGN KEY (`class_category_id`) REFERENCES `class_categories`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `student_subjects` ADD CONSTRAINT `student_subjects_classClassArmSubjectId_fkey` FOREIGN KEY (`classClassArmSubjectId`) REFERENCES `class_class_arm_subjects`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `class_class_arm_subjects` ADD CONSTRAINT `class_class_arm_subjects_class_id_fkey` FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `class_class_arm_subjects` ADD CONSTRAINT `class_class_arm_subjects_class_arm_id_fkey` FOREIGN KEY (`class_arm_id`) REFERENCES `class_arms`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `class_class_arm_subjects` ADD CONSTRAINT `class_class_arm_subjects_subject_id_fkey` FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `class_class_arm_subjects` ADD CONSTRAINT `class_class_arm_subjects_school_id_fkey` FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `attendances` ADD CONSTRAINT `attendances_student_id_fkey` FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `attendances` ADD CONSTRAINT `attendances_school_id_fkey` FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `attendances` ADD CONSTRAINT `attendances_session_id_fkey` FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `attendances` ADD CONSTRAINT `attendances_term_id_fkey` FOREIGN KEY (`term_id`) REFERENCES `terms`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `attendances` ADD CONSTRAINT `attendances_class_id_fkey` FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `attendances` ADD CONSTRAINT `attendances_class_arm_id_fkey` FOREIGN KEY (`class_arm_id`) REFERENCES `class_arms`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `student_class_assignments` ADD CONSTRAINT `student_class_assignments_student_id_fkey` FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `student_class_assignments` ADD CONSTRAINT `student_class_assignments_session_id_fkey` FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `student_class_assignments` ADD CONSTRAINT `student_class_assignments_term_id_fkey` FOREIGN KEY (`term_id`) REFERENCES `terms`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `student_class_assignments` ADD CONSTRAINT `student_class_assignments_class_id_fkey` FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `student_class_assignments` ADD CONSTRAINT `student_class_assignments_class_arm_id_fkey` FOREIGN KEY (`class_arm_id`) REFERENCES `class_arms`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `student_class_assignments` ADD CONSTRAINT `student_class_assignments_school_id_fkey` FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
