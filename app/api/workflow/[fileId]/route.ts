import { getServerSession } from 'next-auth'
import { NextRequest } from 'next/server'
import { authOptions } from '../../../../lib/auth'
import { jsonError } from '../../../../lib/errors'
import { enforceRateLimit } from '../../../../lib/rateLimit'
import { 
  performWorkflowAction, 
  assignFileToReviewer, 
  getFileWorkflowHistory,
  WorkflowAction
} from '../../../../lib/workflow'

export const runtime = 'nodejs'

// Get workflow history for a file
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ fileId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const tenantId = (session.user as unknown as { tenantId?: string }).tenantId
    if (!tenantId) return Response.json({ error: 'No tenant access' }, { status: 403 })

    // Rate limiting
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1'
    const { ok, resetAt } = enforceRateLimit(`workflow:${tenantId}:${ip}`, 100, 60 * 1000)
    if (!ok) return Response.json({ error: 'Rate limit exceeded', resetAt }, { status: 429 })

    const { fileId } = await context.params

    // Get workflow history
    const history = await getFileWorkflowHistory(fileId, tenantId)

    return Response.json({ history })
  } catch (error) {
    return jsonError(error, 'Failed to fetch workflow history')
  }
}

// Perform workflow action
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ fileId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const tenantId = (session.user as unknown as { tenantId?: string }).tenantId
    const reviewerId = (session.user as unknown as { id?: string }).id
    
    if (!tenantId || !reviewerId) return Response.json({ error: 'No tenant access' }, { status: 403 })

    // Rate limiting
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1'
    const { ok, resetAt } = enforceRateLimit(`workflow:action:${tenantId}:${ip}`, 20, 60 * 1000)
    if (!ok) return Response.json({ error: 'Rate limit exceeded', resetAt }, { status: 429 })

    const { fileId } = await context.params
    const { action, comments, assignTo } = await req.json()

    // Validate action
    if (!['APPROVE', 'ADJUST', 'FAIL', 'ASSIGN'].includes(action)) {
      return Response.json({ error: 'Invalid workflow action' }, { status: 400 })
    }

    let result

    if (action === 'ASSIGN' && assignTo) {
      // Assignment action
      result = await assignFileToReviewer(fileId, assignTo, tenantId)
    } else {
      // Standard workflow action
      result = await performWorkflowAction(
        fileId,
        action as WorkflowAction,
        reviewerId,
        tenantId,
        comments
      )
    }

    if (result.success) {
      const newStage = 'newStage' in result ? result.newStage as string : undefined
      return Response.json({
        success: true,
        message: getActionMessage(action, newStage),
        newStage: newStage
      })
    } else {
      return Response.json({
        error: result.error || 'Workflow action failed'
      }, { status: 400 })
    }
  } catch (error) {
    return jsonError(error, 'Failed to perform workflow action')
  }
}

function getActionMessage(action: string, newStage?: string): string {
  switch (action) {
    case 'APPROVE':
      return newStage === 'APPROVED' 
        ? 'File has been approved and completed!'
        : `File approved and moved to ${newStage}`
    case 'ADJUST':
      return `File sent for adjustments to ${newStage}`
    case 'FAIL':
      return 'File has been marked as failed'
    case 'ASSIGN':
      return 'File has been assigned to reviewer'
    default:
      return 'Workflow action completed'
  }
}
