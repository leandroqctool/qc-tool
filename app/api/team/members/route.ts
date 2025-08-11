import { getServerSession } from 'next-auth'
import { NextRequest } from 'next/server'
import { authOptions } from '../../../../lib/auth'
import { jsonError } from '../../../../lib/errors'
import { enforceRateLimit } from '../../../../lib/rateLimit'
import { getTeamMembers, type TeamMember } from '../../../../lib/team-management'

export const runtime = 'nodejs'

// Get team members
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const tenantId = (session.user as unknown as { tenantId?: string }).tenantId
    const userRole = (session.user as unknown as { role?: string }).role
    
    if (!tenantId) return Response.json({ error: 'No tenant access' }, { status: 403 })

    // Check permissions
    if (userRole !== 'admin' && userRole !== 'manager' && userRole !== 'senior_qc') {
      return Response.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Rate limiting
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1'
    const { ok, resetAt } = enforceRateLimit(`team:members:${tenantId}:${ip}`, 30, 60 * 1000)
    if (!ok) return Response.json({ error: 'Rate limit exceeded', resetAt }, { status: 429 })

    const { searchParams } = new URL(req.url)
    const role = searchParams.get('role')
    const status = searchParams.get('status')
    const department = searchParams.get('department')

    let members = await getTeamMembers(tenantId)

    // Apply filters
    if (role) {
      members = members.filter(member => member.role === role)
    }
    if (status) {
      members = members.filter(member => member.status === status)
    }
    if (department) {
      members = members.filter(member => member.department === department)
    }

    // Remove sensitive information based on role
    const filteredMembers = members.map(member => {
      if (userRole === 'admin') {
        return member // Admin sees everything
      } else if (userRole === 'manager') {
        // Managers see most info but not personal preferences
        const { preferences, ...memberData } = member
        return {
          ...memberData,
          preferences: {
            preferredFileTypes: preferences.preferredFileTypes,
            preferredProjectTypes: preferences.preferredProjectTypes,
            mentorshipAvailable: preferences.mentorshipAvailable,
            trainingMode: preferences.trainingMode
          }
        }
      } else {
        // Senior QC sees limited info
        return {
          id: member.id,
          name: member.name,
          role: member.role,
          department: member.department,
          status: member.status,
          skills: member.skills,
          specializations: member.specializations,
          experienceLevel: member.experienceLevel,
          performance: {
            overallRating: member.performance.overallRating,
            averageQualityScore: member.performance.averageQualityScore
          },
          capacity: {
            utilizationPercentage: member.capacity.utilizationPercentage,
            currentAssignments: member.capacity.currentAssignments
          }
        }
      }
    })

    return Response.json({
      members: filteredMembers,
      totalCount: filteredMembers.length,
      filters: { role, status, department }
    })
  } catch (error) {
    return jsonError(error, 'Failed to fetch team members')
  }
}

// Create/Invite new team member
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const tenantId = (session.user as unknown as { tenantId?: string }).tenantId
    const userRole = (session.user as unknown as { role?: string }).role
    const userId = (session.user as unknown as { id?: string }).id
    
    if (!tenantId || !userId) return Response.json({ error: 'Authentication failed' }, { status: 403 })

    // Check permissions
    if (userRole !== 'admin' && userRole !== 'manager') {
      return Response.json({ error: 'Insufficient permissions to invite users' }, { status: 403 })
    }

    // Rate limiting
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1'
    const { ok, resetAt } = enforceRateLimit(`team:invite:${tenantId}:${ip}`, 5, 60 * 1000)
    if (!ok) return Response.json({ error: 'Rate limit exceeded', resetAt }, { status: 429 })

    const {
      email,
      role,
      department,
      permissions,
      personalMessage,
      onboardingTasks,
      mentorId
    } = await req.json()

    // Validate required fields
    if (!email || !role || !department) {
      return Response.json({ error: 'Email, role, and department are required' }, { status: 400 })
    }

    // Validate role hierarchy (managers can't invite admins)
    if (userRole === 'manager' && role === 'admin') {
      return Response.json({ error: 'Managers cannot invite admin users' }, { status: 403 })
    }

    // In a real implementation, you would:
    // 1. Create an invitation record in the database
    // 2. Send an invitation email
    // 3. Set up onboarding tasks
    // 4. Assign mentor if specified

    const inviteId = `invite_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    return Response.json({
      success: true,
      inviteId,
      message: 'Invitation sent successfully',
      inviteDetails: {
        email,
        role,
        department,
        invitedBy: userId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        onboardingTasks: onboardingTasks || [],
        mentorId
      }
    })
  } catch (error) {
    return jsonError(error, 'Failed to send invitation')
  }
}
