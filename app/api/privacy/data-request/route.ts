import { getServerSession } from 'next-auth'
import { NextRequest } from 'next/server'
import { authOptions } from '../../../../lib/auth'
import { jsonError } from '../../../../lib/errors'
import { gdprManager } from '../../../../lib/gdpr-compliance'

export const runtime = 'nodejs'

// Submit data subject request
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const userId = (session.user as unknown as { id?: string }).id
    const tenantId = (session.user as unknown as { tenantId?: string }).tenantId
    
    if (!userId || !tenantId) {
      return Response.json({ error: 'Invalid session' }, { status: 400 })
    }

    const {
      requestType,
      description,
      urgency = 'standard'
    } = await req.json()

    if (!requestType || !['access', 'rectification', 'erasure', 'portability', 'restriction', 'objection'].includes(requestType)) {
      return Response.json({ error: 'Invalid request type' }, { status: 400 })
    }

    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Create data subject request
    const request = {
      id: requestId,
      tenantId,
      userId,
      requestType,
      status: 'pending' as const,
      description: description || `${requestType} request`,
      submittedAt: new Date(),
      verificationMethod: 'email' as const,
      verificationStatus: 'pending' as const,
      metadata: {
        ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
        userAgent: req.headers.get('user-agent') || 'unknown',
        requestSource: 'user_portal' as const,
        urgency,
        legalDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
      }
    }

    // Store request (would be implemented in database)
    console.log(`Data subject request submitted: ${requestId}`)

    // Handle specific request types
    let result: unknown = { requestId }

    switch (requestType) {
      case 'access':
      case 'portability':
        // Start data export process
        const exportPackage = await gdprManager.handleAccessRequest(userId, tenantId, requestId)
        result = { requestId, exportId: exportPackage.id }
        break
      
      case 'erasure':
        // Schedule erasure (requires verification first)
        console.log(`Erasure request scheduled: ${requestId}`)
        break
      
      default:
        // Other requests handled manually
        break
    }

    return Response.json({
      success: true,
      message: 'Data subject request submitted successfully',
      requestId,
      legalDeadline: request.metadata.legalDeadline,
      result
    })

  } catch (error) {
    return jsonError(error, 'Failed to submit data request')
  }
}

// Get user's data requests
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const userId = (session.user as unknown as { id?: string }).id
    const tenantId = (session.user as unknown as { tenantId?: string }).tenantId
    
    if (!userId || !tenantId) {
      return Response.json({ error: 'Invalid session' }, { status: 400 })
    }

    // Mock data - would query database
    const requests = [
      {
        id: 'req_123',
        requestType: 'access',
        status: 'completed',
        description: 'Request for personal data export',
        submittedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        completedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        metadata: {
          legalDeadline: new Date(Date.now() + 23 * 24 * 60 * 60 * 1000)
        }
      }
    ]

    return Response.json({
      requests,
      total: requests.length
    })

  } catch (error) {
    return jsonError(error, 'Failed to fetch data requests')
  }
}
