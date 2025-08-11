import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core'

export const tenants = pgTable('tenants', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
})

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull(),
  passwordHash: text('password_hash').notNull(),
  role: text('role').notNull(),
  tenantId: uuid('tenant_id').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
})

export const projects = pgTable('projects', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  status: text('status').default('CREATED').notNull(),
  tenantId: uuid('tenant_id').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

export const files = pgTable('files', {
  id: uuid('id').defaultRandom().primaryKey(),
  key: text('key').notNull(),
  originalName: text('original_name').notNull(),
  size: text('size').notNull(),
  mimeType: text('mime_type').notNull(),
  url: text('url').notNull(),
  status: text('status').default('UPLOADED').notNull(), // UPLOADED | QC | R1 | R2 | R3 | R4 | APPROVED | FAILED
  currentStage: text('current_stage').default('UPLOADED').notNull(),
  revisionCount: text('revision_count').default('0').notNull(),
  projectId: uuid('project_id'),
  tenantId: uuid('tenant_id').notNull(),
  uploadedBy: uuid('uploaded_by'),
  assignedTo: uuid('assigned_to'), // Current reviewer
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

// QC reviews for files/projects - enhanced for stage-based workflow
export const qcReviews = pgTable('qc_reviews', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id'),
  fileId: uuid('file_id'),
  stage: text('stage').notNull(), // QC | R1 | R2 | R3 | R4
  action: text('action').notNull(), // APPROVE | ADJUST | FAIL
  status: text('status').default('PENDING').notNull(), // PENDING | COMPLETED
  comments: text('comments'),
  reviewerId: uuid('reviewer_id'),
  tenantId: uuid('tenant_id').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

// Workflow stages configuration
export const workflowStages = pgTable('workflow_stages', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(), // QC | R1 | R2 | R3 | R4
  displayName: text('display_name').notNull(), // Quality Control | Revision 1 | etc
  order: text('order').notNull(), // 1 | 2 | 3 | 4 | 5
  isActive: text('is_active').default('true').notNull(),
  tenantId: uuid('tenant_id').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
})

// Stage transitions/history
export const stageTransitions = pgTable('stage_transitions', {
  id: uuid('id').defaultRandom().primaryKey(),
  fileId: uuid('file_id').notNull(),
  fromStage: text('from_stage'),
  toStage: text('to_stage').notNull(),
  action: text('action').notNull(), // APPROVE | ADJUST | FAIL | ASSIGN
  reviewerId: uuid('reviewer_id'),
  comments: text('comments'),
  tenantId: uuid('tenant_id').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
})

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id').notNull(),
  action: text('action').notNull(),
  userId: uuid('user_id').notNull(),
  tenantId: uuid('tenant_id').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
})


