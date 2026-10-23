-- AlterTable
ALTER TABLE `Service` ADD COLUMN `category` VARCHAR(191) NOT NULL DEFAULT 'other',
    ADD COLUMN `popular` BOOLEAN NOT NULL DEFAULT false;

