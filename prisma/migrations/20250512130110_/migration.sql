/*
  Warnings:

  - The values [Male,Female] on the enum `users_gender` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterTable
ALTER TABLE `users` MODIFY `gender` ENUM('male', 'female') NULL;
