ALTER TYPE "ApplicationStatus" ADD VALUE IF NOT EXISTS 'INVITED';

CREATE TABLE "admin_audit_logs" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "admin_user_id" UUID NOT NULL,
  "action" TEXT NOT NULL,
  "entity_type" TEXT NOT NULL,
  "entity_id" TEXT,
  "payload" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "admin_audit_logs_admin_user_id_fkey"
    FOREIGN KEY ("admin_user_id") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "admin_audit_logs_admin_created_idx"
  ON "admin_audit_logs"("admin_user_id", "created_at");
CREATE INDEX "admin_audit_logs_entity_created_idx"
  ON "admin_audit_logs"("entity_type", "created_at");
