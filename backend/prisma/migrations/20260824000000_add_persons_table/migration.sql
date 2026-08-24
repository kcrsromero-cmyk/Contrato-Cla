CREATE TABLE "persons" (
  "id"              UUID        NOT NULL DEFAULT gen_random_uuid(),
  "document_type"   TEXT        NOT NULL,
  "document_number" TEXT        NOT NULL,
  "name"            TEXT,
  "created_at"      TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"      TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "persons_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "persons_document_type_document_number_key" UNIQUE ("document_type", "document_number")
);

ALTER TABLE "contracts"
  ADD COLUMN IF NOT EXISTS "supplier_id"    UUID REFERENCES "persons"("id"),
  ADD COLUMN IF NOT EXISTS "supervisor_id"  UUID REFERENCES "persons"("id"),
  ADD COLUMN IF NOT EXISTS "legal_rep_id"   UUID REFERENCES "persons"("id");

CREATE INDEX "contracts_supplier_id_idx"   ON "contracts"("supplier_id");
CREATE INDEX "contracts_supervisor_id_idx" ON "contracts"("supervisor_id");
CREATE INDEX "contracts_legal_rep_id_idx"  ON "contracts"("legal_rep_id");
CREATE INDEX "persons_document_number_idx" ON "persons"("document_number");