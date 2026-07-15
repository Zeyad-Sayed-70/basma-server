-- AlterTable
ALTER TABLE "instances" ADD COLUMN     "onboarding_answers" JSONB,
ADD COLUMN     "onboarding_completed" BOOLEAN NOT NULL DEFAULT false;
