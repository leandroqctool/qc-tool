-- Create projects and files tables

CREATE TABLE IF NOT EXISTS "projects" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "status" text NOT NULL DEFAULT 'CREATED',
  "tenant_id" uuid NOT NULL,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "files" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "key" text NOT NULL,
  "original_name" text NOT NULL,
  "size" text NOT NULL,
  "mime_type" text NOT NULL,
  "url" text NOT NULL,
  "status" text NOT NULL DEFAULT 'PENDING',
  "project_id" uuid,
  "tenant_id" uuid NOT NULL,
  "uploaded_by" uuid,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);


