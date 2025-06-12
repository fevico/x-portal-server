-- AlterTable
ALTER TABLE `continuous_assessment_components` ADD COLUMN `isDeleted` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `continuous_assessments` ADD COLUMN `isDeleted` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `marking_scheme_components` ADD COLUMN `isDeleted` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `marking_schemes` ADD COLUMN `isDeleted` BOOLEAN NOT NULL DEFAULT false;
