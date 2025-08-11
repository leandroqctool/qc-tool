import { getServerSession } from 'next-auth'
import { NextRequest } from 'next/server'
import { authOptions } from '../../../../lib/auth'
import { jsonError } from '../../../../lib/errors'
import { enforceRateLimit } from '../../../../lib/rateLimit'
import { 
  createSecurityAuditLog,
  type SecurityAuditLog,
  type SecurityAlert
} from '../../../../lib/security'

export const runtime = 'nodejs'

// Get security audit logs
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const userId = (session.user as unknown as { id?: string }).id
    const tenantId = (session.user as unknown as { tenantId?: string }).tenantId
    const userRole = (session.user as unknown as { role?: string }).role
    
    if (!userId || !tenantId) return Response.json({ error: 'Authentication failed' }, { status: 403 })

    // Check permissions - only admins can view audit logs
    if (userRole !== 'admin') {
      return Response.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Rate limiting
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1'
    const { ok, resetAt } = enforceRateLimit(`audit-logs:${tenantId}:${ip}`, 30, 60 * 1000)
    if (!ok) return Response.json({ error: 'Rate limit exceeded', resetAt }, { status: 429 })

    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const perPage = parseInt(searchParams.get('perPage') || '50')
    const riskLevel = searchParams.get('riskLevel')
    const userId_filter = searchParams.get('userId')
    const action = searchParams.get('action')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Mock audit logs - in production, fetch from database
    const mockLogs: SecurityAuditLog[] = [
      {
        id: 'audit_001',
        userId: 'user_1',
        tenantId,
        action: 'login',
        resource: 'authentication',
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        success: true,
        riskLevel: 'low',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
        personalDataAccessed: false,
        metadata: {
          authMethod: '2fa',
          location: 'San Francisco, CA'
        }
      },
      {
        id: 'audit_002',
        userId: 'user_2',
        tenantId,
        action: 'file_export',
        resource: 'files',
        ipAddress: '10.0.0.50',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        success: true,
        riskLevel: 'high',
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
        personalDataAccessed: true,
        dataSubject: 'client_data',
        legalBasis: 'legitimate_interest',
        metadata: {
          fileCount: 25,
          exportFormat: 'xlsx',
          fileTypes: ['image', 'document']
        }
      },
      {
        id: 'audit_003',
        userId: 'user_3',
        tenantId,
        action: 'failed_login',
        resource: 'authentication',
        ipAddress: '203.0.113.45',
        userAgent: 'curl/7.68.0',
        success: false,
        riskLevel: 'high',
        timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000),
        personalDataAccessed: false,
        metadata: {
          failureReason: 'invalid_credentials',
          attemptCount: 5,
          suspicious: true
        }
      },
      {
        id: 'audit_004',
        userId: 'user_1',
        tenantId,
        action: 'user_invite',
        resource: 'team_management',
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        success: true,
        riskLevel: 'medium',
        timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000),
        personalDataAccessed: true,
        dataSubject: 'new_team_member',
        legalBasis: 'contract',
        metadata: {
          invitedEmail: 'new.user@company.com',
          role: 'qc_specialist',
          department: 'Quality Control'
        }
      }
    ]

    // Apply filters
    let filteredLogs = mockLogs
    
    if (riskLevel) {
      filteredLogs = filteredLogs.filter(log => log.riskLevel === riskLevel)
    }
    
    if (userId_filter) {
      filteredLogs = filteredLogs.filter(log => log.userId === userId_filter)
    }
    
    if (action) {
      filteredLogs = filteredLogs.filter(log => log.action.includes(action))
    }
    
    if (startDate) {
      const start = new Date(startDate)
      filteredLogs = filteredLogs.filter(log => log.timestamp >= start)
    }
    
    if (endDate) {
      const end = new Date(endDate)
      filteredLogs = filteredLogs.filter(log => log.timestamp <= end)
    }

    // Pagination
    const startIndex = (page - 1) * perPage
    const endIndex = startIndex + perPage
    const paginatedLogs = filteredLogs.slice(startIndex, endIndex)

    // Security summary
    const summary = {
      totalLogs: filteredLogs.length,
      riskDistribution: {
        low: filteredLogs.filter(l => l.riskLevel === 'low').length,
        medium: filteredLogs.filter(l => l.riskLevel === 'medium').length,
        high: filteredLogs.filter(l => l.riskLevel === 'high').length
      },
      failedActions: filteredLogs.filter(l => !l.success).length,
      personalDataAccess: filteredLogs.filter(l => l.personalDataAccessed).length,
      uniqueUsers: new Set(filteredLogs.map(l => l.userId)).size,
      uniqueIPs: new Set(filteredLogs.map(l => l.ipAddress)).size
    }

    return Response.json({
      logs: paginatedLogs,
      pagination: {
        page,
        perPage,
        totalPages: Math.ceil(filteredLogs.length / perPage),
        totalCount: filteredLogs.length
      },
      summary,
      filters: {
        riskLevel,
        userId: userId_filter,
        action,
        startDate,
        endDate
      }
    })
  } catch (error) {
    return jsonError(error, 'Failed to fetch security audit logs')
  }
}

// Create security audit log
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const userId = (session.user as unknown as { id?: string }).id
    const tenantId = (session.user as unknown as { tenantId?: string }).tenantId
    
    if (!userId || !tenantId) return Response.json({ error: 'Authentication failed' }, { status: 403 })

    // Rate limiting
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1'
    const { ok, resetAt } = enforceRateLimit(`audit-create:${tenantId}:${ip}`, 100, 60 * 1000)
    if (!ok) return Response.json({ error: 'Rate limit exceeded', resetAt }, { status: 429 })

    const { action, resource, success, metadata = {} } = await req.json()
    const userAgent = req.headers.get('user-agent') || 'Unknown'

    if (!action || !resource || success === undefined) {
      return Response.json({ error: 'Action, resource, and success status are required' }, { status: 400 })
    }

    const auditLog = createSecurityAuditLog(
      userId,
      tenantId,
      action,
      resource,
      ip,
      userAgent,
      success,
      metadata
    )

    // In production, save to database
    console.log('Security audit log created:', auditLog)

    return Response.json({
      success: true,
      auditLogId: auditLog.id,
      timestamp: auditLog.timestamp
    })
  } catch (error) {
    return jsonError(error, 'Failed to create security audit log')
  }
}
