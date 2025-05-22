/*
  Warnings:

  - You are about to drop the column `address` on the `admissions` table. All the data in the column will be lost.
  - You are about to drop the column `class_applying` on the `admissions` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `admissions` table. All the data in the column will be lost.
  - You are about to drop the column `dateOfBirth` on the `admissions` table. All the data in the column will be lost.
  - You are about to drop the column `firstName` on the `admissions` table. All the data in the column will be lost.
  - You are about to drop the column `gender` on the `admissions` table. All the data in the column will be lost.
  - You are about to drop the column `guardianId` on the `admissions` table. All the data in the column will be lost.
  - You are about to drop the column `image` on the `admissions` table. All the data in the column will be lost.
  - You are about to drop the column `localGovernment` on the `admissions` table. All the data in the column will be lost.
  - You are about to drop the column `phone` on the `admissions` table. All the data in the column will be lost.
  - You are about to drop the column `schoolId` on the `admissions` table. All the data in the column will be lost.
  - You are about to drop the column `stateOfOrigin` on the `admissions` table. All the data in the column will be lost.
  - You are about to drop the column `surname` on the `admissions` table. All the data in the column will be lost.
  - You are about to drop the `Session` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `guardians` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[student_id]` on the table `admissions` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `school_id` to the `admissions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `session_id` to the `admissions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `student_id` to the `admissions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `admissions` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `Session` DROP FOREIGN KEY `Session_school_id_fkey`;

-- DropForeignKey
ALTER TABLE `admissions` DROP FOREIGN KEY `admissions_class_applying_fkey`;

-- DropForeignKey
ALTER TABLE `admissions` DROP FOREIGN KEY `admissions_guardianId_fkey`;

-- DropForeignKey
ALTER TABLE `admissions` DROP FOREIGN KEY `admissions_schoolId_fkey`;

-- DropIndex
DROP INDEX `admissions_class_applying_fkey` ON `admissions`;

-- DropIndex
DROP INDEX `admissions_guardianId_fkey` ON `admissions`;

-- DropIndex
DROP INDEX `admissions_schoolId_fkey` ON `admissions`;

-- AlterTable
ALTER TABLE `admissions` DROP COLUMN `address`,
    DROP COLUMN `class_applying`,
    DROP COLUMN `createdAt`,
    DROP COLUMN `dateOfBirth`,
    DROP COLUMN `firstName`,
    DROP COLUMN `gender`,
    DROP COLUMN `guardianId`,
    DROP COLUMN `image`,
    DROP COLUMN `localGovernment`,
    DROP COLUMN `phone`,
    DROP COLUMN `schoolId`,
    DROP COLUMN `stateOfOrigin`,
    DROP COLUMN `surname`,
    ADD COLUMN `class_applying_for_id` VARCHAR(191) NULL,
    ADD COLUMN `class_arm_id` VARCHAR(191) NULL,
    ADD COLUMN `contact` VARCHAR(191) NULL,
    ADD COLUMN `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `created_by` VARCHAR(191) NULL,
    ADD COLUMN `date_of_birth` DATETIME(3) NULL,
    ADD COLUMN `former_school_address` VARCHAR(191) NULL,
    ADD COLUMN `former_school_contact` VARCHAR(191) NULL,
    ADD COLUMN `former_school_name` VARCHAR(191) NULL,
    ADD COLUMN `health_problems` VARCHAR(191) NULL,
    ADD COLUMN `home_address` VARCHAR(191) NULL,
    ADD COLUMN `how_heard_about_us` VARCHAR(191) NULL,
    ADD COLUMN `isAdmitted` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `lga` VARCHAR(191) NULL,
    ADD COLUMN `parent_address` VARCHAR(191) NULL,
    ADD COLUMN `parent_contact` VARCHAR(191) NULL,
    ADD COLUMN `parent_email` VARCHAR(191) NULL,
    ADD COLUMN `parent_firstname` VARCHAR(191) NULL,
    ADD COLUMN `parent_id` VARCHAR(191) NULL,
    ADD COLUMN `parent_lastname` VARCHAR(191) NULL,
    ADD COLUMN `parent_othername` VARCHAR(191) NULL,
    ADD COLUMN `parent_relationship` VARCHAR(191) NULL,
    ADD COLUMN `present_class_id` VARCHAR(191) NULL,
    ADD COLUMN `rejection_reason` VARCHAR(191) NULL,
    ADD COLUMN `school_id` VARCHAR(191) NOT NULL,
    ADD COLUMN `session_id` VARCHAR(191) NOT NULL,
    ADD COLUMN `state_of_origin` VARCHAR(191) NULL,
    ADD COLUMN `student_id` VARCHAR(191) NOT NULL,
    ADD COLUMN `updated_at` DATETIME(3) NOT NULL,
    ADD COLUMN `updated_by` VARCHAR(191) NULL,
    MODIFY `email` VARCHAR(191) NULL,
    MODIFY `religion` VARCHAR(191) NULL,
    MODIFY `nationality` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `students` ADD COLUMN `isAdmitted` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `users` ADD COLUMN `lga` VARCHAR(191) NULL,
    ADD COLUMN `nationality` VARCHAR(191) NULL,
    ADD COLUMN `religion` VARCHAR(191) NULL,
    ADD COLUMN `state_of_origin` VARCHAR(191) NULL;

-- DropTable
DROP TABLE `Session`;

-- DropTable
DROP TABLE `guardians`;

-- CreateTable
CREATE TABLE `sessions` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `school_id` VARCHAR(191) NOT NULL,
    `first_term_start` DATETIME(3) NULL,
    `first_term_end` DATETIME(3) NULL,
    `second_term_start` DATETIME(3) NULL,
    `second_term_end` DATETIME(3) NULL,
    `third_term_start` DATETIME(3) NULL,
    `third_term_end` DATETIME(3) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT false,
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by` VARCHAR(191) NULL,
    `updated_by` VARCHAR(191) NULL,

    UNIQUE INDEX `sessions_name_school_id_key`(`name`, `school_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `session_class_arms` (
    `id` VARCHAR(191) NOT NULL,
    `session_id` VARCHAR(191) NOT NULL,
    `class_arm_id` VARCHAR(191) NOT NULL,
    `school_id` VARCHAR(191) NOT NULL,
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by` VARCHAR(191) NULL,
    `updated_by` VARCHAR(191) NULL,

    UNIQUE INDEX `session_class_arms_session_id_class_arm_id_school_id_key`(`session_id`, `class_arm_id`, `school_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `admissions_student_id_key` ON `admissions`(`student_id`);

-- AddForeignKey
ALTER TABLE `admissions` ADD CONSTRAINT `admissions_session_id_fkey` FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `admissions` ADD CONSTRAINT `admissions_school_id_fkey` FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `admissions` ADD CONSTRAINT `admissions_student_id_fkey` FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `admissions` ADD CONSTRAINT `admissions_parent_id_fkey` FOREIGN KEY (`parent_id`) REFERENCES `parents`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `admissions` ADD CONSTRAINT `admissions_present_class_id_fkey` FOREIGN KEY (`present_class_id`) REFERENCES `classes`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `admissions` ADD CONSTRAINT `admissions_class_applying_for_id_fkey` FOREIGN KEY (`class_applying_for_id`) REFERENCES `classes`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `admissions` ADD CONSTRAINT `admissions_class_arm_id_fkey` FOREIGN KEY (`class_arm_id`) REFERENCES `class_arms`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sessions` ADD CONSTRAINT `sessions_school_id_fkey` FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `session_class_arms` ADD CONSTRAINT `session_class_arms_session_id_fkey` FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `session_class_arms` ADD CONSTRAINT `session_class_arms_class_arm_id_fkey` FOREIGN KEY (`class_arm_id`) REFERENCES `class_arms`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `session_class_arms` ADD CONSTRAINT `session_class_arms_school_id_fkey` FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
