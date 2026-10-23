-- AlterTable
ALTER TABLE `Booking` ADD COLUMN `cancelReason` TEXT NULL,
    ADD COLUMN `cancelledAt` DATETIME(3) NULL,
    ADD COLUMN `depositRefunded` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `outcome` ENUM('COMPLETED', 'NO_SHOW') NULL,
    ADD COLUMN `ownerNotes` TEXT NULL,
    MODIFY `paymentStatus` ENUM('PENDING_DEPOSIT', 'DEPOSIT_PAID', 'FULLY_SETTLED', 'EXPIRED', 'REFUNDED', 'CANCELLED') NOT NULL DEFAULT 'PENDING_DEPOSIT';

-- AlterTable
ALTER TABLE `Payment` ADD COLUMN `method` VARCHAR(191) NOT NULL DEFAULT 'STRIPE',
    ADD COLUMN `note` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `AdminLoginToken` (
    `id` VARCHAR(191) NOT NULL,
    `tokenHash` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `usedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `AdminLoginToken_tokenHash_key`(`tokenHash`),
    INDEX `AdminLoginToken_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Setting` (
    `key` VARCHAR(191) NOT NULL,
    `value` TEXT NOT NULL,

    PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ActivityLog` (
    `id` VARCHAR(191) NOT NULL,
    `bookingId` VARCHAR(191) NULL,
    `action` VARCHAR(191) NOT NULL,
    `detail` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ActivityLog_bookingId_createdAt_idx`(`bookingId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ActivityLog` ADD CONSTRAINT `ActivityLog_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `Booking`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

