const { neon } = require('@neondatabase/serverless');
const fs = require('fs');

const sql = neon(process.env.DATABASE_URL);

async function applyMigration() {
  try {
    console.log('Applying workflow stages migration...');
    
    // Execute each statement individually
    const statements = [
      // Add new columns to files table
      `ALTER TABLE files 
       ADD COLUMN current_stage text DEFAULT 'UPLOADED' NOT NULL,
       ADD COLUMN revision_count text DEFAULT '0' NOT NULL,
       ADD COLUMN assigned_to uuid`,
      
      // Update existing files
      `UPDATE files SET status = 'UPLOADED' WHERE status = 'PENDING'`,
      
      // Create workflow_stages table
      `CREATE TABLE workflow_stages (
         id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
         name text NOT NULL,
         display_name text NOT NULL,
         "order" text NOT NULL,
         is_active text DEFAULT 'true' NOT NULL,
         tenant_id uuid NOT NULL,
         created_at timestamp DEFAULT now()
       )`,
      
      // Create stage_transitions table
      `CREATE TABLE stage_transitions (
         id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
         file_id uuid NOT NULL,
         from_stage text,
         to_stage text NOT NULL,
         action text NOT NULL,
         reviewer_id uuid,
         comments text,
         tenant_id uuid NOT NULL,
         created_at timestamp DEFAULT now()
       )`,
      
      // Modify qc_reviews table
      `ALTER TABLE qc_reviews 
       ADD COLUMN stage text,
       ADD COLUMN action text`,
      
      `ALTER TABLE qc_reviews RENAME COLUMN status TO old_status`,
      
      `ALTER TABLE qc_reviews ADD COLUMN status text DEFAULT 'PENDING' NOT NULL`,
      
      // Update existing QC reviews
      `UPDATE qc_reviews SET 
       stage = 'QC',
       action = CASE 
         WHEN old_status = 'APPROVED' THEN 'APPROVE'
         WHEN old_status = 'REJECTED' THEN 'FAIL'
         ELSE 'APPROVE'
       END,
       status = CASE
         WHEN old_status IN ('APPROVED', 'REJECTED') THEN 'COMPLETED'
         ELSE 'PENDING'
       END`,
      
      `ALTER TABLE qc_reviews DROP COLUMN old_status`,
      
      `ALTER TABLE qc_reviews ALTER COLUMN stage SET NOT NULL`,
      
      `ALTER TABLE qc_reviews ALTER COLUMN action SET NOT NULL`
    ];

    // Execute statements one by one using template literals
    console.log('Adding columns to files table...');
    await sql`ALTER TABLE files 
              ADD COLUMN current_stage text DEFAULT 'UPLOADED' NOT NULL,
              ADD COLUMN revision_count text DEFAULT '0' NOT NULL,
              ADD COLUMN assigned_to uuid`;
    
    console.log('Updating existing files...');
    await sql`UPDATE files SET status = 'UPLOADED' WHERE status = 'PENDING'`;
    
    console.log('Creating workflow_stages table...');
    await sql`CREATE TABLE workflow_stages (
                id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
                name text NOT NULL,
                display_name text NOT NULL,
                "order" text NOT NULL,
                is_active text DEFAULT 'true' NOT NULL,
                tenant_id uuid NOT NULL,
                created_at timestamp DEFAULT now()
              )`;
    
    console.log('Creating stage_transitions table...');
    await sql`CREATE TABLE stage_transitions (
                id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
                file_id uuid NOT NULL,
                from_stage text,
                to_stage text NOT NULL,
                action text NOT NULL,
                reviewer_id uuid,
                comments text,
                tenant_id uuid NOT NULL,
                created_at timestamp DEFAULT now()
              )`;
    
    console.log('Modifying qc_reviews table...');
    await sql`ALTER TABLE qc_reviews 
              ADD COLUMN stage text,
              ADD COLUMN action text`;
    
    await sql`ALTER TABLE qc_reviews RENAME COLUMN status TO old_status`;
    
    await sql`ALTER TABLE qc_reviews ADD COLUMN status text DEFAULT 'PENDING' NOT NULL`;
    
    console.log('Updating existing QC reviews...');
    await sql`UPDATE qc_reviews SET 
              stage = 'QC',
              action = CASE 
                WHEN old_status = 'APPROVED' THEN 'APPROVE'
                WHEN old_status = 'REJECTED' THEN 'FAIL'
                ELSE 'APPROVE'
              END,
              status = CASE
                WHEN old_status IN ('APPROVED', 'REJECTED') THEN 'COMPLETED'
                ELSE 'PENDING'
              END`;
    
    await sql`ALTER TABLE qc_reviews DROP COLUMN old_status`;
    
    await sql`ALTER TABLE qc_reviews ALTER COLUMN stage SET NOT NULL`;
    
    await sql`ALTER TABLE qc_reviews ALTER COLUMN action SET NOT NULL`;

    // Insert default workflow stages for existing tenants
    console.log('Inserting default workflow stages...');
    const tenants = await sql`SELECT id FROM tenants`;
    
    for (const tenant of tenants) {
      const stages = [
        { name: 'QC', display_name: 'Quality Control', order: '1' },
        { name: 'R1', display_name: 'Revision 1', order: '2' },
        { name: 'R2', display_name: 'Revision 2', order: '3' },
        { name: 'R3', display_name: 'Revision 3', order: '4' },
        { name: 'R4', display_name: 'Revision 4', order: '5' }
      ];
      
      for (const stage of stages) {
        await sql`
          INSERT INTO workflow_stages (name, display_name, "order", tenant_id)
          VALUES (${stage.name}, ${stage.display_name}, ${stage.order}, ${tenant.id})
        `;
      }
    }

    // Create initial stage transitions for existing files
    console.log('Creating initial stage transitions...');
    const files = await sql`SELECT id, tenant_id FROM files`;
    
    for (const file of files) {
      await sql`
        INSERT INTO stage_transitions (file_id, from_stage, to_stage, action, tenant_id)
        VALUES (${file.id}, NULL, 'UPLOADED', 'ASSIGN', ${file.tenant_id})
      `;
    }
    
    console.log('✅ Migration applied successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Full error:', error);
  }
}

applyMigration();
