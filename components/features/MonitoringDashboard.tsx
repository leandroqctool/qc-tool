"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { LoadingSpinner } from '../ui/LoadingSpinner'
import { useToast } from '../ui/ToastProvider'
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Database,
  Globe,
  HardDrive,
  MemoryStick,
  RefreshCw,
  Server,
  TrendingUp,
  TrendingDown,
  Zap,
  AlertCircle,
  Eye,
  Settings
} from 'lucide-react'

interface MonitoringDashboardProps {
  className?: string
}

interface SystemHealth {
  overall: 'healthy' | 'unhealthy' | 'degraded'
  timestamp: string
  uptime: number
  version: string
  environment: string
  checks: HealthCheck[]
  metrics: SystemMetrics
}

interface HealthCheck {
  service: string
  status: 'healthy' | 'unhealthy' | 'degraded'
  responseTime: number
  timestamp: string
  details?: Record<string, unknown>
  error?: string
}

interface SystemMetrics {
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

interface Alert {
  id: string
  type: 'performance' | 'error' | 'security' | 'availability'
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description: string
  timestamp: string
  resolved: boolean
  metadata: Record<string, unknown>
}

interface TimeSeriesData {
  timestamp: number
  responseTime: number
  errorRate: number
  requestsPerMinute: number
  memoryUsage: number
  cpuUsage: number
}

export default function MonitoringDashboard({ className = '' }: MonitoringDashboardProps) {
  const { show } = useToast()
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null)
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [selectedTimeRange, setSelectedTimeRange] = useState('1h')

  useEffect(() => {
    loadMonitoringData()
    
    // Set up auto-refresh every 30 seconds
    const interval = setInterval(loadMonitoringData, 30000)
    return () => clearInterval(interval)
  }, [selectedTimeRange])

  const loadMonitoringData = async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) setIsRefreshing(true)
    else setIsLoading(true)

    try {
      // Load system health
      const healthResponse = await fetch('/api/health')
      if (healthResponse.ok) {
        const healthData = await healthResponse.json()
        setSystemHealth(healthData)
      }

      // Load metrics and time series data
      const metricsResponse = await fetch(`/api/monitoring/metrics?range=${selectedTimeRange}`)
      if (metricsResponse.ok) {
        const metricsData = await metricsResponse.json()
        setTimeSeriesData(metricsData.timeSeries || [])
      }

      // Load alerts
      const alertsResponse = await fetch('/api/monitoring/alerts')
      if (alertsResponse.ok) {
        const alertsData = await alertsResponse.json()
        setAlerts(alertsData.alerts || [])
      }

      if (showRefreshIndicator) {
        show('Monitoring data refreshed', 'success')
      }
    } catch (error) {
      console.error('Error loading monitoring data:', error)
      show('Failed to load monitoring data', 'error')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  const resolveAlert = async (alertId: string) => {
    try {
      const response = await fetch('/api/monitoring/alerts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertId })
      })

      if (response.ok) {
        setAlerts(alerts.filter(alert => alert.id !== alertId))
        show('Alert resolved successfully', 'success')
      }
    } catch (error) {
      console.error('Error resolving alert:', error)
      show('Failed to resolve alert', 'error')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600'
      case 'degraded': return 'text-yellow-600'
      case 'unhealthy': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'degraded': return <AlertTriangle className="w-4 h-4 text-yellow-600" />
      case 'unhealthy': return <AlertCircle className="w-4 h-4 text-red-600" />
      default: return <Clock className="w-4 h-4 text-gray-600" />
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800'
      case 'high': return 'bg-orange-100 text-orange-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatUptime = (uptime: number) => {
    const days = Math.floor(uptime / (24 * 60 * 60 * 1000))
    const hours = Math.floor((uptime % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000))
    const minutes = Math.floor((uptime % (60 * 60 * 1000)) / (60 * 1000))
    
    if (days > 0) return `${days}d ${hours}h ${minutes}m`
    if (hours > 0) return `${hours}h ${minutes}m`
    return `${minutes}m`
  }

  const formatBytes = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    if (bytes === 0) return '0 Bytes'
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
  }

  if (isLoading) {
    return (
      <div className={`p-8 ${className}`}>
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner className="w-8 h-8" />
          <span className="ml-3 text-[var(--text-secondary)]">Loading monitoring dashboard...</span>
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">System Monitoring</h1>
          <p className="text-[var(--text-secondary)]">
            Real-time system health and performance monitoring
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <select
            value={selectedTimeRange}
            onChange={(e) => setSelectedTimeRange(e.target.value)}
            className="px-3 py-2 border border-[var(--border-light)] rounded-lg text-sm"
          >
            <option value="1h">Last Hour</option>
            <option value="6h">Last 6 Hours</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
          </select>
          
          <Button 
            onClick={() => loadMonitoringData(true)} 
            disabled={isRefreshing}
            size="sm"
            variant="outline"
          >
            {isRefreshing ? (
              <LoadingSpinner className="w-4 h-4 mr-2" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Refresh
          </Button>
        </div>
      </div>

      {/* System Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--text-secondary)]">Overall Status</p>
              <div className="flex items-center gap-2 mt-1">
                {systemHealth && getStatusIcon(systemHealth.overall)}
                <span className={`font-medium capitalize ${systemHealth && getStatusColor(systemHealth.overall)}`}>
                  {systemHealth?.overall || 'Unknown'}
                </span>
              </div>
            </div>
            <Server className="w-8 h-8 text-blue-600" />
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--text-secondary)]">Uptime</p>
              <p className="text-lg font-bold text-[var(--text-primary)]">
                {systemHealth ? formatUptime(systemHealth.uptime) : 'N/A'}
              </p>
            </div>
            <Clock className="w-8 h-8 text-green-600" />
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--text-secondary)]">Response Time</p>
              <p className="text-lg font-bold text-[var(--text-primary)]">
                {systemHealth ? `${systemHealth.metrics.averageResponseTime.toFixed(0)}ms` : 'N/A'}
              </p>
            </div>
            <Zap className="w-8 h-8 text-yellow-600" />
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--text-secondary)]">Active Alerts</p>
              <p className="text-lg font-bold text-red-600">
                {alerts.filter(alert => !alert.resolved).length}
              </p>
            </div>
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
        </Card>
      </div>

      {/* Service Health Checks */}
      <Card className="p-6">
        <CardHeader className="px-0 pt-0">
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Service Health Checks
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          <div className="space-y-4">
            {systemHealth?.checks.map((check) => (
              <div key={check.service} className="flex items-center justify-between p-4 border border-[var(--border-light)] rounded-lg">
                <div className="flex items-center gap-3">
                  {check.service === 'database' && <Database className="w-5 h-5 text-blue-600" />}
                  {check.service === 'cloudflare_r2' && <HardDrive className="w-5 h-5 text-orange-600" />}
                  {check.service === 'external_apis' && <Globe className="w-5 h-5 text-purple-600" />}
                  
                  <div>
                    <div className="font-medium capitalize">
                      {check.service.replace('_', ' ')}
                    </div>
                    <div className="text-sm text-[var(--text-secondary)]">
                      Response: {check.responseTime}ms
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <Badge className={getSeverityColor(check.status)} variant="outline">
                    {check.status}
                  </Badge>
                  {getStatusIcon(check.status)}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <CardHeader className="px-0 pt-0">
            <CardTitle className="flex items-center gap-2">
              <MemoryStick className="w-5 h-5" />
              Memory Usage
            </CardTitle>
          </CardHeader>
          <CardContent className="px-0">
            {systemHealth && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[var(--text-secondary)]">Used Memory</span>
                  <span className="font-medium">
                    {formatBytes(systemHealth.metrics.memoryUsage.used)} / {formatBytes(systemHealth.metrics.memoryUsage.total)}
                  </span>
                </div>
                
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-blue-500 h-3 rounded-full transition-all duration-300" 
                    style={{ width: `${systemHealth.metrics.memoryUsage.percentage}%` }} 
                  />
                </div>
                
                <div className="text-center">
                  <span className="text-2xl font-bold text-[var(--text-primary)]">
                    {systemHealth.metrics.memoryUsage.percentage.toFixed(1)}%
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="p-6">
          <CardHeader className="px-0 pt-0">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Request Metrics
            </CardTitle>
          </CardHeader>
          <CardContent className="px-0">
            {systemHealth && (
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {systemHealth.metrics.requestCount}
                  </div>
                  <div className="text-sm text-blue-700">Total Requests</div>
                </div>
                
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {systemHealth.metrics.errorRate.toFixed(2)}%
                  </div>
                  <div className="text-sm text-green-700">Error Rate</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Active Alerts */}
      {alerts.length > 0 && (
        <Card className="p-6">
          <CardHeader className="px-0 pt-0">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Active Alerts ({alerts.filter(alert => !alert.resolved).length})
            </CardTitle>
          </CardHeader>
          <CardContent className="px-0">
            <div className="space-y-4">
              {alerts.filter(alert => !alert.resolved).map((alert) => (
                <div key={alert.id} className="p-4 border border-[var(--border-light)] rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <Badge className={getSeverityColor(alert.severity)} variant="outline">
                        {alert.severity}
                      </Badge>
                      <div>
                        <div className="font-medium">{alert.title}</div>
                        <div className="text-sm text-[var(--text-secondary)]">
                          {alert.type} • {new Date(alert.timestamp).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => resolveAlert(alert.id)}
                    >
                      Resolve
                    </Button>
                  </div>
                  
                  <p className="text-sm text-[var(--text-secondary)]">
                    {alert.description}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* System Information */}
      <Card className="p-6">
        <CardHeader className="px-0 pt-0">
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            System Information
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          {systemHealth && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <div className="text-sm text-[var(--text-secondary)]">Version</div>
                <div className="font-medium">{systemHealth.version}</div>
              </div>
              
              <div>
                <div className="text-sm text-[var(--text-secondary)]">Environment</div>
                <div className="font-medium capitalize">{systemHealth.environment}</div>
              </div>
              
              <div>
                <div className="text-sm text-[var(--text-secondary)]">Last Check</div>
                <div className="font-medium">
                  {new Date(systemHealth.timestamp).toLocaleString()}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
