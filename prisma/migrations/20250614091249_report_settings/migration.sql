-- CreateTable
CREATE TABLE `ReportSheetSetting` (
    `id` VARCHAR(191) NOT NULL,
    `class_id` VARCHAR(50) NOT NULL,
    `padding` VARCHAR(50) NOT NULL,
    `header_font` VARCHAR(50) NOT NULL,
    `subject_font` VARCHAR(50) NOT NULL,
    `value_font` VARCHAR(50) NOT NULL,
    `class_teacher_compute` BOOLEAN NOT NULL DEFAULT false,
    `show_age` BOOLEAN NOT NULL DEFAULT false,
    `show_position` BOOLEAN NOT NULL DEFAULT false,
    `show_next_fee` BOOLEAN NOT NULL DEFAULT false,
    `school_id` VARCHAR(50) NOT NULL,
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL,
    `created_by` VARCHAR(50) NULL,
    `updated_by` VARCHAR(50) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ReportSheetSetting` ADD CONSTRAINT `ReportSheetSetting_class_id_fkey` FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReportSheetSetting` ADD CONSTRAINT `ReportSheetSetting_school_id_fkey` FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
