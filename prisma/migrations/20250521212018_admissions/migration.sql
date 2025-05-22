/*
  Warnings:

  - You are about to drop the `Admission` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `Admission` DROP FOREIGN KEY `Admission_guardianId_fkey`;

-- DropTable
DROP TABLE `Admission`;

-- CreateTable
CREATE TABLE `admissions` (
    `id` VARCHAR(191) NOT NULL,
    `schoolId` VARCHAR(191) NOT NULL,
    `class_id` VARCHAR(191) NULL,
    `class_applying` VARCHAR(191) NOT NULL,
    `surname` VARCHAR(191) NOT NULL,
    `firstName` VARCHAR(191) NOT NULL,
    `address` VARCHAR(191) NOT NULL,
    `gender` ENUM('male', 'female') NOT NULL,
    `phone` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `dateOfBirth` DATETIME(3) NOT NULL,
    `religion` VARCHAR(191) NOT NULL,
    `nationality` VARCHAR(191) NOT NULL,
    `stateOfOrigin` VARCHAR(191) NOT NULL,
    `localGovernment` VARCHAR(191) NOT NULL,
    `image` VARCHAR(191) NOT NULL,
    `guardianId` VARCHAR(191) NULL,
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `admissions` ADD CONSTRAINT `admissions_schoolId_fkey` FOREIGN KEY (`schoolId`) REFERENCES `schools`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `admissions` ADD CONSTRAINT `admissions_class_id_fkey` FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `admissions` ADD CONSTRAINT `admissions_class_applying_fkey` FOREIGN KEY (`class_applying`) REFERENCES `classes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `admissions` ADD CONSTRAINT `admissions_guardianId_fkey` FOREIGN KEY (`guardianId`) REFERENCES `guardians`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
