-- Additive only: one nullable column on plans. Nothing existing is altered or removed.
ALTER TABLE "plans" ADD COLUMN IF NOT EXISTS "max_api_keys" INTEGER;
