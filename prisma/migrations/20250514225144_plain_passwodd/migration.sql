-- 1) Add as nullable
ALTER TABLE `users`
  ADD COLUMN `plainPassword` VARCHAR(191) NULL;

-- 2) Back-fill existing rows (choose a default you like; here we use the empty string)
UPDATE `users`
  SET `plainPassword` = '';

-- 3) Make it required
ALTER TABLE `users`
  MODIFY COLUMN `plainPassword` VARCHAR(191) NOT NULL;
