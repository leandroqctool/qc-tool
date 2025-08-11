import { getServerSession } from 'next-auth'
import { NextRequest } from 'next/server'
import { authOptions } from '../../../../lib/auth'
import { jsonError } from '../../../../lib/errors'
import { enforceRateLimit } from '../../../../lib/rateLimit'
import { generateExecutiveDashboard, type ExecutiveDashboard } from '../../../../lib/analytics'

export const runtime = 'nodejs'

// Get executive dashboard data
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const tenantId = (session.user as unknown as { tenantId?: string }).tenantId
    const userRole = (session.user as unknown as { role?: string }).role
    
    if (!tenantId) return Response.json({ error: 'No tenant access' }, { status: 403 })

    // Check if user has analytics access (admin or manager roles)
    if (userRole !== 'admin' && userRole !== 'manager') {
      return Response.json({ error: 'Insufficient permissions for analytics' }, { status: 403 })
    }

    // Rate limiting
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1'
    const { ok, resetAt } = enforceRateLimit(`analytics:${tenantId}:${ip}`, 20, 60 * 1000)
    if (!ok) return Response.json({ error: 'Rate limit exceeded', resetAt }, { status: 429 })

    const { searchParams } = new URL(req.url)
    const period = searchParams.get('period') || 'week'
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Calculate date range based on period
    let start: Date, end: Date
    const now = new Date()
    
    if (startDate && endDate) {
      start = new Date(startDate)
      end = new Date(endDate)
    } else {
      switch (period) {
        case 'today':
          start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
          end = now
          break
        case 'week':
          start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          end = now
          break
        case 'month':
          start = new Date(now.getFullYear(), now.getMonth(), 1)
          end = now
          break
        case 'quarter':
          const quarterStart = Math.floor(now.getMonth() / 3) * 3
          start = new Date(now.getFullYear(), quarterStart, 1)
          end = now
          break
        case 'year':
          start = new Date(now.getFullYear(), 0, 1)
          end = now
          break
        default:
          start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          end = now
      }
    }

    // Generate dashboard data
    const dashboard: ExecutiveDashboard = await generateExecutiveDashboard(tenantId, { start, end })

    return Response.json({
      dashboard,
      period: {
        start: start.toISOString(),
        end: end.toISOString(),
        label: dashboard.period.label
      },
      generatedAt: new Date().toISOString()
    })
  } catch (error) {
    return jsonError(error, 'Failed to generate analytics dashboard')
  }
}

// Update dashboard preferences
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const tenantId = (session.user as unknown as { tenantId?: string }).tenantId
    const userId = (session.user as unknown as { id?: string }).id
    
    if (!tenantId || !userId) return Response.json({ error: 'Authentication failed' }, { status: 403 })

    // Rate limiting
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1'
    const { ok, resetAt } = enforceRateLimit(`analytics:update:${tenantId}:${ip}`, 10, 60 * 1000)
    if (!ok) return Response.json({ error: 'Rate limit exceeded', resetAt }, { status: 429 })

    const { preferences } = await req.json()

    // In a real implementation, you would save these preferences to the database
    // For now, we'll just acknowledge the update
    
    return Response.json({
      success: true,
      message: 'Dashboard preferences updated',
      preferences
    })
  } catch (error) {
    return jsonError(error, 'Failed to update dashboard preferences')
  }
}
