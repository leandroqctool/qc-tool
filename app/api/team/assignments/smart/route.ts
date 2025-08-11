import { getServerSession } from 'next-auth'
import { NextRequest } from 'next/server'
import { authOptions } from '../../../../../lib/auth'
import { jsonError } from '../../../../../lib/errors'
import { enforceRateLimit } from '../../../../../lib/rateLimit'
import { generateSmartAssignment, type SmartAssignmentRequest } from '../../../../../lib/team-management'

export const runtime = 'nodejs'

// Generate smart assignment recommendations
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const tenantId = (session.user as unknown as { tenantId?: string }).tenantId
    const userRole = (session.user as unknown as { role?: string }).role
    
    if (!tenantId) return Response.json({ error: 'No tenant access' }, { status: 403 })

    // Check permissions
    if (userRole !== 'admin' && userRole !== 'manager' && userRole !== 'senior_qc') {
      return Response.json({ error: 'Insufficient permissions for smart assignments' }, { status: 403 })
    }

    // Rate limiting
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1'
    const { ok, resetAt } = enforceRateLimit(`team:smart-assign:${tenantId}:${ip}`, 10, 60 * 1000)
    if (!ok) return Response.json({ error: 'Rate limit exceeded', resetAt }, { status: 429 })

    const assignmentRequest: SmartAssignmentRequest = await req.json()

    // Validate required fields
    const { fileId, projectId, clientId, fileType, estimatedComplexity, estimatedTimeMinutes, urgency } = assignmentRequest
    
    if (!fileId || !projectId || !clientId || !fileType || !estimatedComplexity || !estimatedTimeMinutes || !urgency) {
      return Response.json({ 
        error: 'Missing required fields: fileId, projectId, clientId, fileType, estimatedComplexity, estimatedTimeMinutes, urgency' 
      }, { status: 400 })
    }

    // Generate smart assignment recommendations
    const recommendations = await generateSmartAssignment(assignmentRequest, tenantId)

    // Add metadata about the assignment request
    const response = {
      assignmentRequest: {
        ...assignmentRequest,
        requestedAt: new Date().toISOString(),
        requestedBy: session.user?.email
      },
      recommendations,
      totalRecommendations: recommendations.length,
      bestMatch: recommendations[0] || null,
      processingTimeMs: 1200, // Mock processing time
      confidence: recommendations[0]?.confidence || 0
    }

    return Response.json(response)
  } catch (error) {
    return jsonError(error, 'Failed to generate smart assignment recommendations')
  }
}

// Get assignment history and analytics
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const tenantId = (session.user as unknown as { tenantId?: string }).tenantId
    const userRole = (session.user as unknown as { role?: string }).role
    
    if (!tenantId) return Response.json({ error: 'No tenant access' }, { status: 403 })

    // Check permissions
    if (userRole !== 'admin' && userRole !== 'manager') {
      return Response.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Rate limiting
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1'
    const { ok, resetAt } = enforceRateLimit(`team:assign-history:${tenantId}:${ip}`, 20, 60 * 1000)
    if (!ok) return Response.json({ error: 'Rate limit exceeded', resetAt }, { status: 429 })

    const { searchParams } = new URL(req.url)
    const days = parseInt(searchParams.get('days') || '30')
    const memberId = searchParams.get('memberId')

    // Mock assignment analytics
    const analytics = {
      period: {
        days,
        startDate: new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date().toISOString()
      },
      totalAssignments: 156,
      smartAssignments: 134,
      manualAssignments: 22,
      averageConfidenceScore: 0.87,
      
      // Assignment success metrics
      successMetrics: {
        completedOnTime: 142,
        completedLate: 8,
        reassigned: 6,
        averageCompletionTime: 32, // minutes
        clientSatisfactionScore: 4.6
      },
      
      // By complexity
      byComplexity: {
        simple: { count: 45, avgConfidence: 0.92, avgTime: 18 },
        moderate: { count: 67, avgConfidence: 0.89, avgTime: 28 },
        complex: { count: 35, avgConfidence: 0.81, avgTime: 45 },
        expert: { count: 9, avgConfidence: 0.74, avgTime: 78 }
      },
      
      // By urgency
      byUrgency: {
        low: { count: 34, avgConfidence: 0.91 },
        medium: { count: 89, avgConfidence: 0.88 },
        high: { count: 28, avgConfidence: 0.84 },
        critical: { count: 5, avgConfidence: 0.79 }
      },
      
      // Top performers in smart assignments
      topPerformers: [
        { memberId: 'user_1', memberName: 'Sarah Chen', assignmentsCompleted: 47, avgScore: 92.1 },
        { memberId: 'user_2', memberName: 'Mike Rodriguez', assignmentsCompleted: 38, avgScore: 86.7 }
      ],
      
      // Recommendations for improvement
      recommendations: [
        'Increase confidence threshold for complex assignments to 0.85+',
        'Consider skill-based routing for technical file types',
        'Implement workload balancing for peak hours (10-11 AM)',
        'Add client preference matching to assignment algorithm'
      ]
    }

    return Response.json(analytics)
  } catch (error) {
    return jsonError(error, 'Failed to fetch assignment analytics')
  }
}
