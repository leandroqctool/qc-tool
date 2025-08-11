import { NextRequest } from 'next/server'
import { performHealthCheck, alertManager } from '../../../lib/monitoring'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  try {
    // Perform comprehensive health check
    const health = await performHealthCheck()
    
    // Check for alerts
    await alertManager.checkThresholds(health)
    
    // Return appropriate HTTP status based on health
    const status = health.overall === 'healthy' ? 200 : 
                  health.overall === 'degraded' ? 200 : 503
    
    return Response.json(health, { status })
  } catch (error) {
    return Response.json(
      { 
        overall: 'unhealthy',
        timestamp: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error',
        uptime: process.uptime(),
        version: process.env.npm_package_version || '0.1.0',
        environment: process.env.NODE_ENV || 'development',
        checks: [],
        metrics: {
          memoryUsage: {
            used: 0,
            total: 0,
            percentage: 0
          },
          requestCount: 0,
          errorRate: 0,
          averageResponseTime: 0,
          activeConnections: 0
        }
      },
      { status: 503 }
    )
  }
}


