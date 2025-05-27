-- AlterTable
ALTER TABLE `classes` ADD COLUMN `category` ENUM('junior', 'senior') NOT NULL DEFAULT 'junior';
