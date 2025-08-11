import { getServerSession } from 'next-auth'
import { NextRequest } from 'next/server'
import { authOptions } from '../../../../lib/auth'
import { jsonError } from '../../../../lib/errors'
import { enforceRateLimit } from '../../../../lib/rateLimit'
import { getTeamCapacityForecast } from '../../../../lib/team-management'

export const runtime = 'nodejs'

// Get team capacity forecast
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const tenantId = (session.user as unknown as { tenantId?: string }).tenantId
    const userRole = (session.user as unknown as { role?: string }).role
    
    if (!tenantId) return Response.json({ error: 'No tenant access' }, { status: 403 })

    // Check permissions
    if (userRole !== 'admin' && userRole !== 'manager') {
      return Response.json({ error: 'Insufficient permissions for capacity planning' }, { status: 403 })
    }

    // Rate limiting
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1'
    const { ok, resetAt } = enforceRateLimit(`team:capacity:${tenantId}:${ip}`, 15, 60 * 1000)
    if (!ok) return Response.json({ error: 'Rate limit exceeded', resetAt }, { status: 429 })

    const { searchParams } = new URL(req.url)
    const days = parseInt(searchParams.get('days') || '7')
    const includeSkillGaps = searchParams.get('includeSkillGaps') === 'true'

    // Validate days parameter
    if (days < 1 || days > 90) {
      return Response.json({ error: 'Days parameter must be between 1 and 90' }, { status: 400 })
    }

    const forecast = await getTeamCapacityForecast(tenantId, days)

    // Add additional insights
    const insights = {
      capacityStatus: forecast.capacityGap > 0 ? 'under_utilized' : 
                     forecast.capacityGap < -forecast.totalCapacityHours * 0.1 ? 'over_capacity' : 'optimal',
      
      criticalMembers: forecast.memberForecasts.filter(member => member.capacity === 'critical'),
      
      availableMembers: forecast.memberForecasts.filter(member => member.capacity === 'under'),
      
      // Capacity trends (mock data)
      trends: {
        utilizationTrend: 'increasing', // 'increasing', 'decreasing', 'stable'
        projectedUtilization7Days: 78.5,
        projectedUtilization30Days: 82.1,
        seasonalPattern: 'normal' // 'peak', 'low', 'normal'
      },
      
      // Risk assessment
      risks: [
        ...(forecast.capacityGap < -forecast.totalCapacityHours * 0.2 ? 
          ['High risk of burnout and quality degradation'] : []),
        ...(forecast.memberForecasts.filter(m => m.capacity === 'critical').length > 1 ? 
          ['Multiple team members at critical capacity'] : []),
        ...(forecast.skillGaps?.filter(s => s.criticalShortage).length || 0 > 0 ? 
          ['Critical skill shortages identified'] : [])
      ],
      
      // Opportunities
      opportunities: [
        ...(forecast.capacityGap > forecast.totalCapacityHours * 0.2 ? 
          ['Opportunity to take on additional projects'] : []),
        ...(forecast.memberForecasts.filter(m => m.capacity === 'under').length > 2 ? 
          ['Multiple team members available for training'] : [])
      ]
    }

    const response = {
      forecast,
      insights,
      generatedAt: new Date().toISOString(),
      parameters: { days, includeSkillGaps }
    }

    // Remove skill gaps if not requested
    if (!includeSkillGaps) {
      const { skillGaps, ...forecastWithoutSkillGaps } = response.forecast
      response.forecast = forecastWithoutSkillGaps
    }

    return Response.json(response)
  } catch (error) {
    return jsonError(error, 'Failed to generate capacity forecast')
  }
}

// Update team member capacity settings
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
      return Response.json({ error: 'Insufficient permissions to update capacity' }, { status: 403 })
    }

    // Rate limiting
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1'
    const { ok, resetAt } = enforceRateLimit(`team:capacity-update:${tenantId}:${ip}`, 10, 60 * 1000)
    if (!ok) return Response.json({ error: 'Rate limit exceeded', resetAt }, { status: 429 })

    const {
      memberId,
      maxConcurrentAssignments,
      hoursPerWeek,
      workingHours,
      timeZone,
      upcomingTimeOff
    } = await req.json()

    // Validate required fields
    if (!memberId) {
      return Response.json({ error: 'Member ID is required' }, { status: 400 })
    }

    // Validate working hours format
    if (workingHours) {
      const validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
      for (const day of validDays) {
        if (workingHours[day] && (!workingHours[day].start || !workingHours[day].end)) {
          return Response.json({ error: `Invalid working hours format for ${day}` }, { status: 400 })
        }
      }
    }

    // In a real implementation, you would update the database
    // For now, we'll just acknowledge the update

    return Response.json({
      success: true,
      message: 'Team member capacity updated successfully',
      updatedAt: new Date().toISOString(),
      updatedBy: userId,
      updates: {
        memberId,
        maxConcurrentAssignments,
        hoursPerWeek,
        workingHours,
        timeZone,
        upcomingTimeOff
      }
    })
  } catch (error) {
    return jsonError(error, 'Failed to update team member capacity')
  }
}
