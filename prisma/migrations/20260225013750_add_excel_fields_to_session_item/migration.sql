/*
  Warnings:

  - You are about to drop the column `recipient` on the `SessionItem` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `SessionItem` DROP COLUMN `recipient`,
    ADD COLUMN `deliveryOption` VARCHAR(255) NULL,
    ADD COLUMN `shippingProvider` VARCHAR(255) NULL,
    ADD COLUMN `variation` VARCHAR(500) NULL;
