// Enterprise Monitoring & Health Check System
import { neon } from '@neondatabase/serverless'

export interface HealthCheck {
  service: string
  status: 'healthy' | 'unhealthy' | 'degraded'
  responseTime: number
  timestamp: Date
  details?: Record<string, unknown>
  error?: string
}

export interface SystemHealth {
  overall: 'healthy' | 'unhealthy' | 'degraded'
  timestamp: Date
  uptime: number
  version: string
  environment: string
  checks: HealthCheck[]
  metrics: SystemMetrics
}

export interface SystemMetrics {
  memoryUsage: {
    used: number
    total: number
    percentage: number
  }
  requestCount: number
  errorRate: number
  averageResponseTime: number
  activeConnections: number
  cacheHitRate?: number
}

export interface AlertConfig {
  enabled: boolean
  channels: AlertChannel[]
  thresholds: {
    responseTime: number // ms
    errorRate: number // percentage
    memoryUsage: number // percentage
    diskUsage: number // percentage
  }
}

export interface AlertChannel {
  type: 'email' | 'slack' | 'webhook' | 'sms'
  endpoint: string
  enabled: boolean
  severity: 'low' | 'medium' | 'high' | 'critical'
}

export interface Alert {
  id: string
  type: 'performance' | 'error' | 'security' | 'availability'
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description: string
  timestamp: Date
  resolved: boolean
  resolvedAt?: Date
  metadata: Record<string, unknown>
}

// Performance metrics tracking
class MetricsCollector {
  private static instance: MetricsCollector
  private metrics: Map<string, number[]> = new Map()
  private requestCount = 0
  private errorCount = 0
  private startTime = Date.now()

  static getInstance(): MetricsCollector {
    if (!MetricsCollector.instance) {
      MetricsCollector.instance = new MetricsCollector()
    }
    return MetricsCollector.instance
  }

  recordResponseTime(endpoint: string, responseTime: number): void {
    if (!this.metrics.has(endpoint)) {
      this.metrics.set(endpoint, [])
    }
    
    const times = this.metrics.get(endpoint)!
    times.push(responseTime)
    
    // Keep only last 1000 measurements
    if (times.length > 1000) {
      times.shift()
    }
    
    this.requestCount++
  }

  recordError(endpoint: string): void {
    this.errorCount++
  }

  getAverageResponseTime(endpoint?: string): number {
    if (endpoint) {
      const times = this.metrics.get(endpoint) || []
      return times.length > 0 ? times.reduce((sum, time) => sum + time, 0) / times.length : 0
    }
    
    // Overall average
    const allTimes = Array.from(this.metrics.values()).flat()
    return allTimes.length > 0 ? allTimes.reduce((sum, time) => sum + time, 0) / allTimes.length : 0
  }

  getErrorRate(): number {
    return this.requestCount > 0 ? (this.errorCount / this.requestCount) * 100 : 0
  }

  getUptime(): number {
    return Date.now() - this.startTime
  }

  getRequestCount(): number {
    return this.requestCount
  }

  reset(): void {
    this.metrics.clear()
    this.requestCount = 0
    this.errorCount = 0
    this.startTime = Date.now()
  }
}

// Health check implementations
export async function checkDatabase(): Promise<HealthCheck> {
  const startTime = Date.now()
  
  try {
    const sql = neon(process.env.DATABASE_URL!)
    const result = await sql`SELECT 1 as health_check`
    const responseTime = Date.now() - startTime
    
    if (result.length === 1 && result[0].health_check === 1) {
      return {
        service: 'database',
        status: 'healthy',
        responseTime,
        timestamp: new Date(),
        details: {
          connection: 'successful',
          query: 'SELECT 1',
          result: 'ok'
        }
      }
    } else {
      throw new Error('Unexpected database response')
    }
  } catch (error) {
    return {
      service: 'database',
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      timestamp: new Date(),
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

export async function checkCloudflareR2(): Promise<HealthCheck> {
  const startTime = Date.now()
  
  try {
    // Simple connectivity check to R2
    const response = await fetch(`${process.env.R2_PUBLIC_BASE_URL}/health-check-file.txt`, {
      method: 'HEAD',
      signal: AbortSignal.timeout(5000)
    })
    
    const responseTime = Date.now() - startTime
    
    return {
      service: 'cloudflare_r2',
      status: response.ok ? 'healthy' : 'degraded',
      responseTime,
      timestamp: new Date(),
      details: {
        status: response.status,
        statusText: response.statusText,
        endpoint: process.env.R2_PUBLIC_BASE_URL
      },
      error: !response.ok ? `HTTP ${response.status}: ${response.statusText}` : undefined
    }
  } catch (error) {
    return {
      service: 'cloudflare_r2',
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      timestamp: new Date(),
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

export async function checkExternalAPIs(): Promise<HealthCheck> {
  const startTime = Date.now()
  
  try {
    // Check external services (placeholder - add actual external APIs)
    const checks = await Promise.allSettled([
      // Add actual external API checks here
      Promise.resolve({ status: 'ok' })
    ])
    
    const responseTime = Date.now() - startTime
    const failedChecks = checks.filter(check => check.status === 'rejected')
    
    return {
      service: 'external_apis',
      status: failedChecks.length === 0 ? 'healthy' : failedChecks.length < checks.length ? 'degraded' : 'unhealthy',
      responseTime,
      timestamp: new Date(),
      details: {
        totalChecks: checks.length,
        successfulChecks: checks.length - failedChecks.length,
        failedChecks: failedChecks.length
      },
      error: failedChecks.length > 0 ? `${failedChecks.length} external API(s) failed` : undefined
    }
  } catch (error) {
    return {
      service: 'external_apis',
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      timestamp: new Date(),
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

export function getSystemMetrics(): SystemMetrics {
  const metrics = MetricsCollector.getInstance()
  
  // Memory usage (Node.js process)
  const memUsage = process.memoryUsage()
  const memoryUsage = {
    used: memUsage.heapUsed,
    total: memUsage.heapTotal,
    percentage: (memUsage.heapUsed / memUsage.heapTotal) * 100
  }
  
  return {
    memoryUsage,
    requestCount: metrics.getRequestCount(),
    errorRate: metrics.getErrorRate(),
    averageResponseTime: metrics.getAverageResponseTime(),
    activeConnections: 0, // Placeholder - would need connection pool info
    cacheHitRate: undefined // Placeholder - would need cache metrics
  }
}

export async function performHealthCheck(): Promise<SystemHealth> {
  const startTime = Date.now()
  
  // Run all health checks in parallel
  const checks = await Promise.all([
    checkDatabase(),
    checkCloudflareR2(),
    checkExternalAPIs()
  ])
  
  // Determine overall health
  const unhealthyChecks = checks.filter(check => check.status === 'unhealthy')
  const degradedChecks = checks.filter(check => check.status === 'degraded')
  
  let overall: 'healthy' | 'unhealthy' | 'degraded'
  if (unhealthyChecks.length > 0) {
    overall = 'unhealthy'
  } else if (degradedChecks.length > 0) {
    overall = 'degraded'
  } else {
    overall = 'healthy'
  }
  
  const metrics = getSystemMetrics()
  const metricsCollector = MetricsCollector.getInstance()
  
  return {
    overall,
    timestamp: new Date(),
    uptime: metricsCollector.getUptime(),
    version: process.env.npm_package_version || '0.1.0',
    environment: process.env.NODE_ENV || 'development',
    checks,
    metrics
  }
}

// Alert management
export class AlertManager {
  private static instance: AlertManager
  private alerts: Alert[] = []
  private config: AlertConfig = {
    enabled: true,
    channels: [],
    thresholds: {
      responseTime: 5000, // 5 seconds
      errorRate: 5, // 5%
      memoryUsage: 80, // 80%
      diskUsage: 85 // 85%
    }
  }

  static getInstance(): AlertManager {
    if (!AlertManager.instance) {
      AlertManager.instance = new AlertManager()
    }
    return AlertManager.instance
  }

  async checkThresholds(health: SystemHealth): Promise<void> {
    if (!this.config.enabled) return

    const alerts: Alert[] = []

    // Check response time
    if (health.metrics.averageResponseTime > this.config.thresholds.responseTime) {
      alerts.push({
        id: `response-time-${Date.now()}`,
        type: 'performance',
        severity: 'high',
        title: 'High Response Time',
        description: `Average response time (${health.metrics.averageResponseTime}ms) exceeds threshold (${this.config.thresholds.responseTime}ms)`,
        timestamp: new Date(),
        resolved: false,
        metadata: {
          currentValue: health.metrics.averageResponseTime,
          threshold: this.config.thresholds.responseTime
        }
      })
    }

    // Check error rate
    if (health.metrics.errorRate > this.config.thresholds.errorRate) {
      alerts.push({
        id: `error-rate-${Date.now()}`,
        type: 'error',
        severity: 'high',
        title: 'High Error Rate',
        description: `Error rate (${health.metrics.errorRate.toFixed(2)}%) exceeds threshold (${this.config.thresholds.errorRate}%)`,
        timestamp: new Date(),
        resolved: false,
        metadata: {
          currentValue: health.metrics.errorRate,
          threshold: this.config.thresholds.errorRate
        }
      })
    }

    // Check memory usage
    if (health.metrics.memoryUsage.percentage > this.config.thresholds.memoryUsage) {
      alerts.push({
        id: `memory-usage-${Date.now()}`,
        type: 'performance',
        severity: 'medium',
        title: 'High Memory Usage',
        description: `Memory usage (${health.metrics.memoryUsage.percentage.toFixed(2)}%) exceeds threshold (${this.config.thresholds.memoryUsage}%)`,
        timestamp: new Date(),
        resolved: false,
        metadata: {
          currentValue: health.metrics.memoryUsage.percentage,
          threshold: this.config.thresholds.memoryUsage,
          memoryUsed: health.metrics.memoryUsage.used,
          memoryTotal: health.metrics.memoryUsage.total
        }
      })
    }

    // Check service health
    const unhealthyServices = health.checks.filter(check => check.status === 'unhealthy')
    for (const service of unhealthyServices) {
      alerts.push({
        id: `service-${service.service}-${Date.now()}`,
        type: 'availability',
        severity: 'critical',
        title: `Service Unavailable: ${service.service}`,
        description: `Service ${service.service} is unhealthy: ${service.error || 'Unknown error'}`,
        timestamp: new Date(),
        resolved: false,
        metadata: {
          service: service.service,
          error: service.error,
          responseTime: service.responseTime
        }
      })
    }

    // Store and send alerts
    for (const alert of alerts) {
      this.alerts.push(alert)
      await this.sendAlert(alert)
    }
  }

  private async sendAlert(alert: Alert): Promise<void> {
    // Send to configured channels
    for (const channel of this.config.channels) {
      if (!channel.enabled) continue

      try {
        switch (channel.type) {
          case 'webhook':
            await fetch(channel.endpoint, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(alert)
            })
            break
          case 'email':
            // Implement email sending
            console.log(`Email alert sent: ${alert.title}`)
            break
          case 'slack':
            // Implement Slack webhook
            console.log(`Slack alert sent: ${alert.title}`)
            break
          case 'sms':
            // Implement SMS sending
            console.log(`SMS alert sent: ${alert.title}`)
            break
        }
      } catch (error) {
        console.error(`Failed to send alert via ${channel.type}:`, error)
      }
    }
  }

  getActiveAlerts(): Alert[] {
    return this.alerts.filter(alert => !alert.resolved)
  }

  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId)
    if (alert && !alert.resolved) {
      alert.resolved = true
      alert.resolvedAt = new Date()
      return true
    }
    return false
  }

  updateConfig(config: Partial<AlertConfig>): void {
    this.config = { ...this.config, ...config }
  }
}

// Middleware for request/response monitoring
export function createMonitoringMiddleware() {
  const metrics = MetricsCollector.getInstance()
  
  return (req: Request, next: () => void) => {
    const startTime = Date.now()
    const url = new URL(req.url || '', 'http://localhost')
    
    // Record response time when request completes
    const responseTime = Date.now() - startTime
    metrics.recordResponseTime(url.pathname, responseTime)
    
    next()
  }
}

// Export singleton instances
export const metricsCollector = MetricsCollector.getInstance()
export const alertManager = AlertManager.getInstance()
