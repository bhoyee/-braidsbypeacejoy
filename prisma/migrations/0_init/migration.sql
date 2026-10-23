-- CreateTable
CREATE TABLE `Service` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `imageUrl` VARCHAR(191) NULL,
    `priceCents` INTEGER NOT NULL,
    `durationMin` INTEGER NOT NULL,
    `hairBundles` INTEGER NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Service_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Booking` (
    `id` VARCHAR(191) NOT NULL,
    `bookingCode` VARCHAR(191) NOT NULL,
    `clientName` VARCHAR(191) NOT NULL,
    `clientEmail` VARCHAR(191) NOT NULL,
    `clientPhone` VARCHAR(191) NOT NULL,
    `notes` TEXT NULL,
    `appointmentAt` DATETIME(3) NOT NULL,
    `endAt` DATETIME(3) NOT NULL,
    `serviceId` VARCHAR(191) NOT NULL,
    `totalCents` INTEGER NOT NULL,
    `addOnsCents` INTEGER NOT NULL DEFAULT 0,
    `addOns` JSON NULL,
    `amountPaidCents` INTEGER NOT NULL DEFAULT 0,
    `paymentStatus` ENUM('PENDING_DEPOSIT', 'DEPOSIT_PAID', 'FULLY_SETTLED', 'EXPIRED', 'REFUNDED') NOT NULL DEFAULT 'PENDING_DEPOSIT',
    `stripeSessionId` VARCHAR(191) NOT NULL,
    `holdExpiresAt` DATETIME(3) NULL,
    `reminderSentAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Booking_bookingCode_key`(`bookingCode`),
    UNIQUE INDEX `Booking_stripeSessionId_key`(`stripeSessionId`),
    INDEX `Booking_appointmentAt_endAt_idx`(`appointmentAt`, `endAt`),
    INDEX `Booking_clientEmail_idx`(`clientEmail`),
    INDEX `Booking_paymentStatus_appointmentAt_idx`(`paymentStatus`, `appointmentAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Payment` (
    `id` VARCHAR(191) NOT NULL,
    `bookingId` VARCHAR(191) NOT NULL,
    `kind` ENUM('DEPOSIT', 'BALANCE') NOT NULL,
    `amountCents` INTEGER NOT NULL,
    `status` ENUM('PENDING', 'PAID', 'EXPIRED', 'REFUNDED') NOT NULL DEFAULT 'PENDING',
    `stripeSessionId` VARCHAR(191) NOT NULL,
    `stripePaymentIntentId` VARCHAR(191) NULL,
    `paidAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Payment_stripeSessionId_key`(`stripeSessionId`),
    INDEX `Payment_bookingId_kind_status_idx`(`bookingId`, `kind`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `scheduler_lock` (
    `id` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Booking` ADD CONSTRAINT `Booking_serviceId_fkey` FOREIGN KEY (`serviceId`) REFERENCES `Service`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `Booking`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

