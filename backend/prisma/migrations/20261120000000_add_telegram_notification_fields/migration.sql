-- AlterTable
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "telegram_chat_id" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "telegram_link_code" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "telegram_link_code_expires_at" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "users_telegram_link_code_key" ON "users"("telegram_link_code");
