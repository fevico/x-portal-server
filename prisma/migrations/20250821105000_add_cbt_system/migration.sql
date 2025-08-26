-- Add CBT columns to schools
ALTER TABLE `schools` 
ADD COLUMN `cbt_exams` BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN `cbt_papers` INTEGER NOT NULL DEFAULT 3,
ADD COLUMN `cbt_max_retries` INTEGER NOT NULL DEFAULT 1;

-- We'll handle QuestionType as a string column with check constraint
-- MySQL doesn't support custom ENUM types, we'll use a CHECK constraint

-- CreateTable
CREATE TABLE `exams` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT,
    `start_date` DATETIME NOT NULL,
    `end_date` DATETIME NOT NULL,
    `session_id` VARCHAR(191) NOT NULL,
    `term_definition_id` VARCHAR(191) NOT NULL,
    `class_id` VARCHAR(191) NOT NULL,
    `marking_scheme_component_id` VARCHAR(191),
    `sub_component_id` VARCHAR(191),
    `school_id` VARCHAR(191) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `is_deleted` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL,
    `created_by` VARCHAR(191) NOT NULL,
    `updated_by` VARCHAR(191),
    `deleted_at` DATETIME,
    `deleted_by` VARCHAR(191),

    INDEX `idx_exam_school`(`school_id`),
    INDEX `idx_exam_class`(`class_id`),
    INDEX `idx_exam_session_term`(`session_id`, `term_definition_id`),
    INDEX `idx_exam_audit`(`created_by`, `updated_by`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `papers` (
    `id` VARCHAR(191) NOT NULL,
    `exam_id` VARCHAR(191) NOT NULL,
    `subject_id` VARCHAR(191) NOT NULL,
    `duration` INTEGER NOT NULL,
    `max_retries` INTEGER NOT NULL DEFAULT 1,
    `current_retries` INTEGER NOT NULL DEFAULT 0,
    `randomize_questions` BOOLEAN NOT NULL DEFAULT true,
    `show_result` BOOLEAN NOT NULL DEFAULT true,
    `show_corrections` BOOLEAN NOT NULL DEFAULT false,
    `school_id` VARCHAR(191) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `is_deleted` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL,
    `created_by` VARCHAR(191) NOT NULL,
    `updated_by` VARCHAR(191),
    `deleted_at` DATETIME,
    `deleted_by` VARCHAR(191),

    INDEX `idx_paper_school`(`school_id`),
    INDEX `idx_paper_exam`(`exam_id`),
    INDEX `idx_paper_audit`(`created_by`, `updated_by`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `questions` (
    `id` VARCHAR(191) NOT NULL,
    `content` TEXT NOT NULL,
    `type` ENUM('MULTIPLE_CHOICE', 'TRUE_FALSE', 'SHORT_ANSWER', 'ESSAY', 'MATCHING') NOT NULL,
    `options` JSON,
    `correct_answer` TEXT NOT NULL,
    `explanation` TEXT,
    `difficulty_level` INTEGER NOT NULL DEFAULT 1,
    `subject_id` VARCHAR(191) NOT NULL,
    `topic_tags` JSON,
    `school_id` VARCHAR(191) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `is_deleted` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL,
    `created_by` VARCHAR(191) NOT NULL,
    `updated_by` VARCHAR(191),
    `deleted_at` DATETIME,
    `deleted_by` VARCHAR(191),

    INDEX `idx_question_school`(`school_id`),
    INDEX `idx_question_subject`(`subject_id`),
    INDEX `idx_question_audit`(`created_by`, `updated_by`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `question_papers` (
    `id` VARCHAR(191) NOT NULL,
    `paper_id` VARCHAR(191) NOT NULL,
    `question_id` VARCHAR(191) NOT NULL,
    `order` INTEGER NOT NULL,
    `score` DOUBLE NOT NULL,
    `school_id` VARCHAR(191) NOT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL,
    `created_by` VARCHAR(191) NOT NULL,
    `updated_by` VARCHAR(191),

    UNIQUE INDEX `question_papers_paper_id_question_id_key`(`paper_id`, `question_id`),
    INDEX `idx_question_paper_paper`(`paper_id`),
    INDEX `idx_question_paper_school`(`school_id`),
    INDEX `idx_question_paper_audit`(`created_by`, `updated_by`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `student_responses` (
    `id` VARCHAR(191) NOT NULL,
    `student_id` VARCHAR(191) NOT NULL,
    `paper_id` VARCHAR(191) NOT NULL,
    `answers` JSON NOT NULL,
    `score` DOUBLE,
    `start_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `end_time` DATETIME,
    `attempt` INTEGER NOT NULL DEFAULT 1,
    `is_completed` BOOLEAN NOT NULL DEFAULT false,
    `school_id` VARCHAR(191) NOT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL,
    `submitted_by` VARCHAR(191) NOT NULL,
    `graded_by` VARCHAR(191),
    `graded_at` DATETIME,

    INDEX `idx_student_response_school`(`school_id`),
    INDEX `idx_student_response_student`(`student_id`),
    INDEX `idx_student_response_paper`(`paper_id`),
    INDEX `idx_student_response_audit`(`submitted_by`, `graded_by`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `exams` ADD CONSTRAINT `exams_session_id_fkey` FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `exams` ADD CONSTRAINT `exams_term_definition_id_fkey` FOREIGN KEY (`term_definition_id`) REFERENCES `term_definitions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `exams` ADD CONSTRAINT `exams_class_id_fkey` FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `exams` ADD CONSTRAINT `exams_marking_scheme_component_id_fkey` FOREIGN KEY (`marking_scheme_component_id`) REFERENCES `marking_scheme_components`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `exams` ADD CONSTRAINT `exams_sub_component_id_fkey` FOREIGN KEY (`sub_component_id`) REFERENCES `continuous_assessment_components`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `exams` ADD CONSTRAINT `exams_school_id_fkey` FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `exams` ADD CONSTRAINT `exams_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `exams` ADD CONSTRAINT `exams_updated_by_fkey` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `exams` ADD CONSTRAINT `exams_deleted_by_fkey` FOREIGN KEY (`deleted_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `papers` ADD CONSTRAINT `papers_exam_id_fkey` FOREIGN KEY (`exam_id`) REFERENCES `exams`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `papers` ADD CONSTRAINT `papers_subject_id_fkey` FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `papers` ADD CONSTRAINT `papers_school_id_fkey` FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `papers` ADD CONSTRAINT `papers_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `papers` ADD CONSTRAINT `papers_updated_by_fkey` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `papers` ADD CONSTRAINT `papers_deleted_by_fkey` FOREIGN KEY (`deleted_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `questions` ADD CONSTRAINT `questions_subject_id_fkey` FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `questions` ADD CONSTRAINT `questions_school_id_fkey` FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `questions` ADD CONSTRAINT `questions_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `questions` ADD CONSTRAINT `questions_updated_by_fkey` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `questions` ADD CONSTRAINT `questions_deleted_by_fkey` FOREIGN KEY (`deleted_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `question_papers` ADD CONSTRAINT `question_papers_paper_id_fkey` FOREIGN KEY (`paper_id`) REFERENCES `papers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `question_papers` ADD CONSTRAINT `question_papers_question_id_fkey` FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `question_papers` ADD CONSTRAINT `question_papers_school_id_fkey` FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `question_papers` ADD CONSTRAINT `question_papers_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `question_papers` ADD CONSTRAINT `question_papers_updated_by_fkey` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `student_responses` ADD CONSTRAINT `student_responses_student_id_fkey` FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `student_responses` ADD CONSTRAINT `student_responses_paper_id_fkey` FOREIGN KEY (`paper_id`) REFERENCES `papers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `student_responses` ADD CONSTRAINT `student_responses_school_id_fkey` FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `student_responses` ADD CONSTRAINT `student_responses_submitted_by_fkey` FOREIGN KEY (`submitted_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `student_responses` ADD CONSTRAINT `student_responses_graded_by_fkey` FOREIGN KEY (`graded_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
