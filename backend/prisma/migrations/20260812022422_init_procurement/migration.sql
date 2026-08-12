-- CreateTable
CREATE TABLE "organizations" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "organization_id" UUID,
    "roles" TEXT[] DEFAULT ARRAY['USER']::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "plan_id" UUID,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plans" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "capabilities" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "capabilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan_capabilities" (
    "plan_id" UUID NOT NULL,
    "capability_id" UUID NOT NULL,

    CONSTRAINT "plan_capabilities_pkey" PRIMARY KEY ("plan_id","capability_id")
);

-- CreateTable
CREATE TABLE "suppliers" (
    "id" UUID NOT NULL,
    "document_type" TEXT,
    "document_number" TEXT,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "procurement_processes" (
    "id" UUID NOT NULL,
    "process_id" TEXT NOT NULL,
    "description" TEXT,
    "url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "procurement_processes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contracts" (
    "id" UUID NOT NULL,
    "contract_id" TEXT NOT NULL,
    "reference" TEXT,
    "status" TEXT,
    "contract_type" TEXT,
    "modality" TEXT,
    "justification" TEXT,
    "object" TEXT NOT NULL,
    "delivery_conditions" TEXT,
    "signature_date" TIMESTAMP(3),
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "last_update" TIMESTAMP(3),
    "contract_value" DOUBLE PRECISION,
    "advance_payment_value" DOUBLE PRECISION,
    "invoiced_value" DOUBLE PRECISION,
    "paid_value" DOUBLE PRECISION,
    "pending_payment_value" DOUBLE PRECISION,
    "pending_execution_value" DOUBLE PRECISION,
    "cdp_balance" DOUBLE PRECISION,
    "duration" DOUBLE PRECISION,
    "added_days" DOUBLE PRECISION,
    "is_extendable" TEXT,
    "location" TEXT,
    "centralized_entity" TEXT,
    "order" TEXT,
    "sector" TEXT,
    "branch" TEXT,
    "supervisor_name" TEXT,
    "spender_name" TEXT,
    "department" TEXT,
    "city" TEXT,
    "entity_name" TEXT NOT NULL,
    "entity_code" TEXT NOT NULL,
    "entity_nit" TEXT,
    "supplier_id" UUID,
    "procurement_process_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "favorite_contracts" (
    "user_id" UUID NOT NULL,
    "contract_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favorite_contracts_pkey" PRIMARY KEY ("user_id","contract_id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "user_id" UUID,
    "resource" TEXT,
    "details" JSONB,
    "ip_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "plans_name_key" ON "plans"("name");

-- CreateIndex
CREATE UNIQUE INDEX "capabilities_name_key" ON "capabilities"("name");

-- CreateIndex
CREATE UNIQUE INDEX "suppliers_document_number_key" ON "suppliers"("document_number");

-- CreateIndex
CREATE UNIQUE INDEX "procurement_processes_process_id_key" ON "procurement_processes"("process_id");

-- CreateIndex
CREATE UNIQUE INDEX "contracts_contract_id_key" ON "contracts"("contract_id");

-- CreateIndex
CREATE INDEX "contracts_entity_code_idx" ON "contracts"("entity_code");

-- CreateIndex
CREATE INDEX "contracts_department_city_idx" ON "contracts"("department", "city");

-- CreateIndex
CREATE INDEX "contracts_signature_date_idx" ON "contracts"("signature_date");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_capabilities" ADD CONSTRAINT "plan_capabilities_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_capabilities" ADD CONSTRAINT "plan_capabilities_capability_id_fkey" FOREIGN KEY ("capability_id") REFERENCES "capabilities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_procurement_process_id_fkey" FOREIGN KEY ("procurement_process_id") REFERENCES "procurement_processes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorite_contracts" ADD CONSTRAINT "favorite_contracts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorite_contracts" ADD CONSTRAINT "favorite_contracts_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
