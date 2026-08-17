-- CreateTable
CREATE TABLE "favorite_entities" (
    "user_id" UUID NOT NULL,
    "entity_code" TEXT NOT NULL,
    "entity_name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favorite_entities_pkey" PRIMARY KEY ("user_id","entity_code")
);

-- AddForeignKey
ALTER TABLE "favorite_entities" ADD CONSTRAINT "favorite_entities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
