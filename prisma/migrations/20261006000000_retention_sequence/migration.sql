-- AlterTable
ALTER TABLE `EmailContact` ADD COLUMN `retentionStep` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `retentionVisitAt` DATETIME(3) NULL;

