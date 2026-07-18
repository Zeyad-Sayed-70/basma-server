-- AlterEnum
ALTER TYPE "PaymentStatus" ADD VALUE 'STUDENT_CONFIRMED' AFTER 'PAID';

-- CreateEnum
CREATE TYPE "PaymentMethodType" AS ENUM ('PAYMOB', 'WALLET', 'INSTAPAY');

-- CreateEnum
CREATE TYPE "WalletType" AS ENUM ('VODAFONE_CASH', 'ORANGE_CASH', 'ETISALAT_FLOUS', 'WE_PAY');

-- CreateTable
CREATE TABLE "teacher_payment_methods" (
    "id" TEXT NOT NULL,
    "instanceId" TEXT NOT NULL,
    "type" "PaymentMethodType" NOT NULL,
    "walletType" "WalletType",
    "accountName" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teacher_payment_methods_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "teacher_payment_methods_instanceId_idx" ON "teacher_payment_methods"("instanceId");

-- AddForeignKey
ALTER TABLE "teacher_payment_methods" ADD CONSTRAINT "teacher_payment_methods_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "payments" ADD COLUMN "paymentMethodType" "PaymentMethodType" NOT NULL DEFAULT 'PAYMOB';
ALTER TABLE "payments" ADD COLUMN "teacherPaymentMethodId" TEXT;
ALTER TABLE "payments" ADD COLUMN "studentConfirmedAt" TIMESTAMP(3);
ALTER TABLE "payments" ADD COLUMN "teacherConfirmedAt" TIMESTAMP(3);

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_teacherPaymentMethodId_fkey" FOREIGN KEY ("teacherPaymentMethodId") REFERENCES "teacher_payment_methods"("id") ON DELETE SET NULL ON UPDATE CASCADE;
