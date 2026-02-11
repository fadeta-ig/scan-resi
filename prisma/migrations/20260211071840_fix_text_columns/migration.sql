-- AlterTable
ALTER TABLE `SessionItem` MODIFY `trackingId` VARCHAR(500) NOT NULL,
    MODIFY `recipient` TEXT NULL,
    MODIFY `productName` TEXT NULL;
