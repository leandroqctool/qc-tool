import { getServerSession } from 'next-auth'
import { NextRequest } from 'next/server'
import { authOptions } from '../../../../lib/auth'
import { jsonError } from '../../../../lib/errors'
import { metricsCollector, alertManager } from '../../../../lib/monitoring'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const userRole = (session.user as unknown as { role?: string }).role
    
    // Only admins can access monitoring metrics
    if (userRole !== 'admin') {
      return Response.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const timeRange = searchParams.get('range') || '1h' // 1h, 6h, 24h, 7d
    const endpoint = searchParams.get('endpoint')

    // Get current metrics
    const metrics = {
      uptime: metricsCollector.getUptime(),
      requestCount: metricsCollector.getRequestCount(),
      errorRate: metricsCollector.getErrorRate(),
      averageResponseTime: metricsCollector.getAverageResponseTime(endpoint || undefined),
      memoryUsage: process.memoryUsage(),
      alerts: {
        active: alertManager.getActiveAlerts(),
        total: alertManager.getActiveAlerts().length
      },
      timestamp: new Date().toISOString()
    }

    // Add time-series data (mock implementation)
    const timeSeriesData = generateTimeSeriesData(timeRange)

    return Response.json({
      metrics,
      timeSeries: timeSeriesData,
      range: timeRange,
      endpoint: endpoint || 'all'
    })

  } catch (error) {
    return jsonError(error, 'Failed to fetch monitoring metrics')
  }
}

// Mock time series data generation
function generateTimeSeriesData(range: string) {
  const now = Date.now()
  const intervals = {
    '1h': { points: 60, interval: 60000 }, // 1 minute intervals
    '6h': { points: 72, interval: 300000 }, // 5 minute intervals  
    '24h': { points: 96, interval: 900000 }, // 15 minute intervals
    '7d': { points: 168, interval: 3600000 } // 1 hour intervals
  }

  const config = intervals[range as keyof typeof intervals] || intervals['1h']
  const data = []

  for (let i = config.points; i >= 0; i--) {
    const timestamp = now - (i * config.interval)
    
    // Generate realistic mock data with some variance
    const baseResponseTime = 200 + Math.random() * 300
    const baseErrorRate = 0.5 + Math.random() * 2
    const baseMemoryUsage = 60 + Math.random() * 20
    
    data.push({
      timestamp,
      responseTime: Math.round(baseResponseTime),
      errorRate: Math.round(baseErrorRate * 100) / 100,
      requestsPerMinute: Math.round(50 + Math.random() * 100),
      memoryUsage: Math.round(baseMemoryUsage * 100) / 100,
      cpuUsage: Math.round((30 + Math.random() * 40) * 100) / 100
    })
  }

  return data
}
