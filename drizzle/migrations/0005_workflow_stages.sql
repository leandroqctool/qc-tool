-- Migration: Add workflow stages and stage-based QC system
-- Add new columns to files table for stage-based workflow
ALTER TABLE files 
ADD COLUMN current_stage text DEFAULT 'UPLOADED' NOT NULL,
ADD COLUMN revision_count text DEFAULT '0' NOT NULL,
ADD COLUMN assigned_to uuid;

-- Update existing files to use new status values
UPDATE files SET status = 'UPLOADED' WHERE status = 'PENDING';

-- Create workflow stages configuration table
CREATE TABLE workflow_stages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  display_name text NOT NULL,
  "order" text NOT NULL,
  is_active text DEFAULT 'true' NOT NULL,
  tenant_id uuid NOT NULL,
  created_at timestamp DEFAULT now()
);

-- Create stage transitions history table
CREATE TABLE stage_transitions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  file_id uuid NOT NULL,
  from_stage text,
  to_stage text NOT NULL,
  action text NOT NULL,
  reviewer_id uuid,
  comments text,
  tenant_id uuid NOT NULL,
  created_at timestamp DEFAULT now()
);

-- Update QC reviews table structure for stage-based workflow
ALTER TABLE qc_reviews 
ADD COLUMN stage text,
ADD COLUMN action text,
RENAME COLUMN status TO old_status;

ALTER TABLE qc_reviews 
ADD COLUMN status text DEFAULT 'PENDING' NOT NULL;

-- Migrate existing QC reviews to new structure
UPDATE qc_reviews SET 
  stage = 'QC',
  action = CASE 
    WHEN old_status = 'APPROVED' THEN 'APPROVE'
    WHEN old_status = 'REJECTED' THEN 'FAIL'
    ELSE 'APPROVE'
  END,
  status = CASE
    WHEN old_status IN ('APPROVED', 'REJECTED') THEN 'COMPLETED'
    ELSE 'PENDING'
  END;

-- Remove old status column
ALTER TABLE qc_reviews DROP COLUMN old_status;

-- Make stage and action columns NOT NULL now that we have data
ALTER TABLE qc_reviews ALTER COLUMN stage SET NOT NULL;
ALTER TABLE qc_reviews ALTER COLUMN action SET NOT NULL;

-- Insert default workflow stages for existing tenants
INSERT INTO workflow_stages (name, display_name, "order", tenant_id)
SELECT 'QC', 'Quality Control', '1', id FROM tenants
UNION ALL
SELECT 'R1', 'Revision 1', '2', id FROM tenants
UNION ALL
SELECT 'R2', 'Revision 2', '3', id FROM tenants
UNION ALL
SELECT 'R3', 'Revision 3', '4', id FROM tenants
UNION ALL
SELECT 'R4', 'Revision 4', '5', id FROM tenants;

-- Create initial stage transitions for existing files
INSERT INTO stage_transitions (file_id, from_stage, to_stage, action, tenant_id)
SELECT id, NULL, 'UPLOADED', 'ASSIGN', tenant_id
FROM files;
