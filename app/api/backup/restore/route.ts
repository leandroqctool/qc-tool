import { getServerSession } from 'next-auth'
import { NextRequest } from 'next/server'
import { authOptions } from '../../../../lib/auth'
import { jsonError } from '../../../../lib/errors'
import { backupManager } from '../../../../lib/backup'

export const runtime = 'nodejs'

// Restore from backup
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const userRole = (session.user as unknown as { role?: string }).role
    const tenantId = (session.user as unknown as { tenantId?: string }).tenantId
    
    // Only admins can restore backups
    if (userRole !== 'admin') {
      return Response.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const {
      backupId,
      includeDatabase = true,
      includeFiles = true,
      targetTenant,
      dryRun = false
    } = await req.json()
    
    if (!backupId) {
      return Response.json({ error: 'Backup ID is required' }, { status: 400 })
    }

    const restoreOptions = {
      backupId,
      includeDatabase,
      includeFiles,
      targetTenant: targetTenant || tenantId,
      dryRun
    }

    const result = await backupManager.restoreFromBackup(restoreOptions)

    return Response.json({
      success: result.success,
      message: result.success ? 'Restore completed successfully' : 'Restore completed with errors',
      result: {
        restoredItems: result.restoredItems,
        errors: result.errors,
        duration: result.duration,
        dryRun
      }
    })

  } catch (error) {
    return jsonError(error, 'Failed to restore backup')
  }
}
