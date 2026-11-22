-- Additive only: one index. Nothing existing is altered or removed.
CREATE INDEX IF NOT EXISTS "audit_logs_created_at_idx" ON "audit_logs"("created_at");
