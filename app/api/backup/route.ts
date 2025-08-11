import { getServerSession } from 'next-auth'
import { NextRequest } from 'next/server'
import { authOptions } from '../../../lib/auth'
import { jsonError } from '../../../lib/errors'
import { backupManager } from '../../../lib/backup'

export const runtime = 'nodejs'

// List backups
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const userRole = (session.user as unknown as { role?: string }).role
    const tenantId = (session.user as unknown as { tenantId?: string }).tenantId
    
    // Only admins can access backups
    if (userRole !== 'admin') {
      return Response.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const targetTenant = searchParams.get('tenant') || tenantId

    const backups = await backupManager.listBackups(targetTenant)

    return Response.json({
      backups,
      total: backups.length,
      summary: {
        completed: backups.filter(b => b.status === 'completed').length,
        failed: backups.filter(b => b.status === 'failed').length,
        running: backups.filter(b => b.status === 'running').length,
        totalSize: backups.reduce((sum, b) => sum + b.size, 0)
      }
    })

  } catch (error) {
    return jsonError(error, 'Failed to list backups')
  }
}

// Create backup
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const userRole = (session.user as unknown as { role?: string }).role
    const tenantId = (session.user as unknown as { tenantId?: string }).tenantId
    
    // Only admins can create backups
    if (userRole !== 'admin') {
      return Response.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { targetTenant, type = 'full' } = await req.json()
    const backupTenant = targetTenant || tenantId

    if (type !== 'full') {
      return Response.json({ error: 'Only full backups are currently supported' }, { status: 400 })
    }

    // Start backup process
    const backup = await backupManager.createFullBackup(backupTenant)

    return Response.json({
      success: true,
      message: 'Backup created successfully',
      backup: {
        id: backup.id,
        type: backup.type,
        status: backup.status,
        startTime: backup.startTime,
        endTime: backup.endTime,
        size: backup.size,
        metadata: backup.metadata
      }
    })

  } catch (error) {
    return jsonError(error, 'Failed to create backup')
  }
}

// Delete backup
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const userRole = (session.user as unknown as { role?: string }).role
    
    // Only admins can delete backups
    if (userRole !== 'admin') {
      return Response.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { backupId } = await req.json()
    
    if (!backupId) {
      return Response.json({ error: 'Backup ID is required' }, { status: 400 })
    }

    await backupManager.deleteBackup(backupId)

    return Response.json({
      success: true,
      message: 'Backup deleted successfully',
      backupId
    })

  } catch (error) {
    return jsonError(error, 'Failed to delete backup')
  }
}
