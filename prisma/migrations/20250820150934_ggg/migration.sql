-- Create a temporary column
ALTER TABLE `student_invoice_assignments` ADD COLUMN `temp_status` ENUM('paid', 'unpaid', 'partial') DEFAULT 'unpaid';

-- Copy existing status values with mapping
UPDATE `student_invoice_assignments` SET `temp_status` = 
  CASE 
    WHEN `status` = 'submitted' THEN 'unpaid'
    WHEN `status` = 'approved' THEN 'unpaid'
    WHEN `status` = 'rejected' THEN 'unpaid'
    WHEN `status` IN ('paid', 'unpaid', 'partial') THEN `status`
    ELSE 'unpaid'
  END;

-- Drop the old status column
ALTER TABLE `student_invoice_assignments` DROP COLUMN `status`;

-- Rename temporary column to status
ALTER TABLE `student_invoice_assignments` RENAME COLUMN `temp_status` TO `status`;
