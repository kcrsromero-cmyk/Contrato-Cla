-- AlterTable
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "plan_expires_at" TIMESTAMP(6);
