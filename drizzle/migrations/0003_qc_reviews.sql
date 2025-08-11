-- Create qc_reviews table
CREATE TABLE IF NOT EXISTS "qc_reviews" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid,
  "file_id" uuid,
  "status" text NOT NULL DEFAULT 'IN_QC',
  "comments" text,
  "reviewer_id" uuid,
  "tenant_id" uuid NOT NULL,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);


