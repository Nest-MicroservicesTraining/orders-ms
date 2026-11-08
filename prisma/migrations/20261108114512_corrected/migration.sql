/*
  Warnings:

  - You are about to drop the column `StripeChargeId` on the `Order` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Order" DROP COLUMN "StripeChargeId",
ADD COLUMN     "stripeChargeId" TEXT;
