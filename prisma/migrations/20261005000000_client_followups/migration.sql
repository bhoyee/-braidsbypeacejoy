-- AlterTable
ALTER TABLE `Booking` ADD COLUMN `reviewRequestSentAt` DATETIME(3) NULL;

-- CreateTable
CREATE TABLE `EmailContact` (
    `email` VARCHAR(191) NOT NULL,
    `unsubscribedAt` DATETIME(3) NULL,
    `lastRetentionAt` DATETIME(3) NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`email`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

