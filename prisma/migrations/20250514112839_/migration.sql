/*
  Warnings:

  - You are about to drop the column `rememberToken` on the `users` table. All the data in the column will be lost.
  - You are about to drop the `SubRole` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[sub_role_id,permission_id,school_id]` on the table `sub_role_permissions` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE `SubRole` DROP FOREIGN KEY `SubRole_school_id_fkey`;

-- DropForeignKey
ALTER TABLE `sub_role_permissions` DROP FOREIGN KEY `sub_role_permissions_sub_role_id_fkey`;

-- DropForeignKey
ALTER TABLE `users` DROP FOREIGN KEY `users_sub_role_id_fkey`;

-- DropIndex
DROP INDEX `sub_role_permissions_sub_role_id_permission_id_key` ON `sub_role_permissions`;

-- DropIndex
DROP INDEX `users_sub_role_id_fkey` ON `users`;

-- AlterTable
ALTER TABLE `sub_role_permissions` ADD COLUMN `school_id` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `subscriptions` ADD COLUMN `features` JSON NULL;

-- AlterTable
ALTER TABLE `users` DROP COLUMN `rememberToken`,
    ADD COLUMN `remember_token` VARCHAR(191) NULL,
    ADD COLUMN `username` VARCHAR(191) NOT NULL DEFAULT 'superadmin',
    MODIFY `email` VARCHAR(191) NULL,
    MODIFY `gender` ENUM('male', 'female') NULL;

-- DropTable
DROP TABLE `SubRole`;

-- CreateTable
CREATE TABLE `staff` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `staff_id` VARCHAR(191) NULL,
    `department` VARCHAR(191) NULL,
    `position` VARCHAR(191) NULL,
    `hire_date` DATETIME(3) NULL,
    `qualifications` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `staff_user_id_key`(`user_id`),
    UNIQUE INDEX `staff_staff_id_key`(`staff_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `students` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `student_id` VARCHAR(191) NULL,
    `class` VARCHAR(191) NULL,
    `admission_date` DATETIME(3) NULL,
    `date_of_birth` DATETIME(3) NULL,
    `parent_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `students_user_id_key`(`user_id`),
    UNIQUE INDEX `students_student_id_key`(`student_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `parents` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `occupation` VARCHAR(191) NULL,
    `address` VARCHAR(191) NULL,
    `relationship` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `parents_user_id_key`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sub_roles` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `school_id` VARCHAR(191) NULL,
    `description` VARCHAR(191) NULL,
    `isGlobal` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `sub_roles_name_school_id_key`(`name`, `school_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `log_entries` (
    `id` VARCHAR(191) NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `target` VARCHAR(191) NULL,
    `targetId` VARCHAR(191) NULL,
    `user_id` VARCHAR(191) NULL,
    `school_id` VARCHAR(191) NULL,
    `meta` JSON NULL,
    `timestamp` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `sub_role_permissions_sub_role_id_permission_id_school_id_key` ON `sub_role_permissions`(`sub_role_id`, `permission_id`, `school_id`);

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_sub_role_id_fkey` FOREIGN KEY (`sub_role_id`) REFERENCES `sub_roles`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `staff` ADD CONSTRAINT `staff_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `students` ADD CONSTRAINT `students_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `students` ADD CONSTRAINT `students_parent_id_fkey` FOREIGN KEY (`parent_id`) REFERENCES `parents`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `parents` ADD CONSTRAINT `parents_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sub_roles` ADD CONSTRAINT `sub_roles_school_id_fkey` FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sub_role_permissions` ADD CONSTRAINT `sub_role_permissions_school_id_fkey` FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sub_role_permissions` ADD CONSTRAINT `sub_role_permissions_sub_role_id_fkey` FOREIGN KEY (`sub_role_id`) REFERENCES `sub_roles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `log_entries` ADD CONSTRAINT `log_entries_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `log_entries` ADD CONSTRAINT `log_entries_school_id_fkey` FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
