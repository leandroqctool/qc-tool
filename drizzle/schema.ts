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
  status: text('status').default('PENDING').notNull(),
  projectId: uuid('project_id'),
  tenantId: uuid('tenant_id').notNull(),
  uploadedBy: uuid('uploaded_by'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})


