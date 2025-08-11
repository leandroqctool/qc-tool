import { getServerSession } from 'next-auth'
import { NextRequest } from 'next/server'
import { authOptions } from '../../../../lib/auth'
import { jsonError } from '../../../../lib/errors'
import { alertManager } from '../../../../lib/monitoring'

export const runtime = 'nodejs'

// Get alerts
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const userRole = (session.user as unknown as { role?: string }).role
    
    // Only admins can access alerts
    if (userRole !== 'admin') {
      return Response.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const severity = searchParams.get('severity')
    const type = searchParams.get('type')
    const resolved = searchParams.get('resolved')

    let alerts = alertManager.getActiveAlerts()

    // Apply filters
    if (severity) {
      alerts = alerts.filter(alert => alert.severity === severity)
    }
    
    if (type) {
      alerts = alerts.filter(alert => alert.type === type)
    }
    
    if (resolved !== null) {
      const isResolved = resolved === 'true'
      alerts = alerts.filter(alert => alert.resolved === isResolved)
    }

    return Response.json({
      alerts,
      total: alerts.length,
      summary: {
        critical: alerts.filter(a => a.severity === 'critical').length,
        high: alerts.filter(a => a.severity === 'high').length,
        medium: alerts.filter(a => a.severity === 'medium').length,
        low: alerts.filter(a => a.severity === 'low').length
      }
    })

  } catch (error) {
    return jsonError(error, 'Failed to fetch alerts')
  }
}

// Resolve alert
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const userRole = (session.user as unknown as { role?: string }).role
    
    // Only admins can resolve alerts
    if (userRole !== 'admin') {
      return Response.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { alertId } = await req.json()
    
    if (!alertId) {
      return Response.json({ error: 'Alert ID is required' }, { status: 400 })
    }

    const resolved = alertManager.resolveAlert(alertId)
    
    if (!resolved) {
      return Response.json({ error: 'Alert not found or already resolved' }, { status: 404 })
    }

    return Response.json({
      success: true,
      message: 'Alert resolved successfully',
      alertId
    })

  } catch (error) {
    return jsonError(error, 'Failed to resolve alert')
  }
}
