import { getDb } from './db'
import { auditLogs } from '../drizzle/schema'

export async function createAudit(
  tenantId: string,
  userId: string,
  entityType: string,
  entityId: string,
  action: string
) {
  try {
    const db = getDb()
    await db.insert(auditLogs).values({ tenantId, userId, entityType, entityId, action })
  } catch {
    // best-effort; ignore errors
  }
}


