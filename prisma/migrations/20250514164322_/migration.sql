-- AlterTable
ALTER TABLE `sub_roles` ADD COLUMN `scope` ENUM('platform', 'school') NOT NULL DEFAULT 'school';

-- AlterTable
ALTER TABLE `users` MODIFY `gender` ENUM('male', 'female', 'other') NULL;
