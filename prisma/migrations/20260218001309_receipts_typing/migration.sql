/*
  Warnings:

  - The primary key for the `ConversationMember` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `ConversationMember` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `Message` table. All the data in the column will be lost.
  - The primary key for the `MessageReceipt` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `MessageReceipt` table. All the data in the column will be lost.
  - The `status` column on the `MessageReceipt` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Made the column `email` on table `User` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "ReceiptStatus" AS ENUM ('DELIVERED', 'READ');

-- DropIndex
DROP INDEX "ConversationMember_conversationId_userId_key";

-- DropIndex
DROP INDEX "MessageReceipt_messageId_userId_key";

-- AlterTable
ALTER TABLE "ConversationMember" DROP CONSTRAINT "ConversationMember_pkey",
DROP COLUMN "id",
ADD CONSTRAINT "ConversationMember_pkey" PRIMARY KEY ("conversationId", "userId");

-- AlterTable
ALTER TABLE "Message" DROP COLUMN "status";

-- AlterTable
ALTER TABLE "MessageReceipt" DROP CONSTRAINT "MessageReceipt_pkey",
DROP COLUMN "id",
DROP COLUMN "status",
ADD COLUMN     "status" "ReceiptStatus" NOT NULL DEFAULT 'DELIVERED',
ADD CONSTRAINT "MessageReceipt_pkey" PRIMARY KEY ("messageId", "userId");

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "email" SET NOT NULL;

-- DropEnum
DROP TYPE "MessageStatus";
