-- CreateTable
CREATE TABLE `ClassArmTeacherAssignment` (
    `id` VARCHAR(191) NOT NULL,
    `staff_id` VARCHAR(191) NOT NULL,
    `class_id` VARCHAR(191) NOT NULL,
    `class_arm_id` VARCHAR(191) NOT NULL,
    `school_id` VARCHAR(191) NOT NULL,
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by` VARCHAR(191) NULL,
    `updated_by` VARCHAR(191) NULL,

    INDEX `ClassArmTeacherAssignment_school_id_staff_id_idx`(`school_id`, `staff_id`),
    UNIQUE INDEX `ClassArmTeacherAssignment_class_id_class_arm_id_school_id_key`(`class_id`, `class_arm_id`, `school_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ClassArmTeacherAssignment` ADD CONSTRAINT `ClassArmTeacherAssignment_staff_id_fkey` FOREIGN KEY (`staff_id`) REFERENCES `staff`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ClassArmTeacherAssignment` ADD CONSTRAINT `ClassArmTeacherAssignment_class_id_fkey` FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ClassArmTeacherAssignment` ADD CONSTRAINT `ClassArmTeacherAssignment_class_arm_id_fkey` FOREIGN KEY (`class_arm_id`) REFERENCES `class_arms`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ClassArmTeacherAssignment` ADD CONSTRAINT `ClassArmTeacherAssignment_school_id_fkey` FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
