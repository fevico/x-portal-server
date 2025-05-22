/*
  Warnings:

  - Added the required column `firstName` to the `guardians` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `admissions` ADD COLUMN `isAccepted` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `otherInfoId` VARCHAR(191) NULL,
    ADD COLUMN `schoolInformationId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `guardians` ADD COLUMN `firstName` VARCHAR(191) NOT NULL,
    ADD COLUMN `relationship` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `SchoolInformation` (
    `id` VARCHAR(191) NOT NULL,
    `schoolName` VARCHAR(191) NOT NULL,
    `address` VARCHAR(191) NOT NULL,
    `contact` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `OtherInfo` (
    `id` VARCHAR(191) NOT NULL,
    `healthProblem` VARCHAR(191) NOT NULL,
    `hearAboutUs` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `admissions` ADD CONSTRAINT `admissions_otherInfoId_fkey` FOREIGN KEY (`otherInfoId`) REFERENCES `OtherInfo`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `admissions` ADD CONSTRAINT `admissions_schoolInformationId_fkey` FOREIGN KEY (`schoolInformationId`) REFERENCES `SchoolInformation`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
