"use client"

import React, { useState, useEffect } from 'react'
import { Card } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { LoadingSpinner } from '../ui/LoadingSpinner'
import { useToast } from '../ui/ToastProvider'
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  Clock,
  Target,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Brain,
  Zap,
  Eye,
  Download,
  RefreshCw,
  Calendar,
  Filter,
  ChevronUp,
  ChevronDown,
  Award,
  Activity,
  PieChart,
  LineChart
} from 'lucide-react'
import {
  type ExecutiveDashboard as DashboardType,
  type KPIMetric,
  formatKPIValue,
  getKPITrendColor,
  calculateTargetProgress,
  getAlertIcon,
  getInsightIcon
} from '../../lib/analytics'

interface ExecutiveDashboardProps {
  className?: string
}

export default function ExecutiveDashboard({ className = '' }: ExecutiveDashboardProps) {
  const { show } = useToast()
  const [dashboard, setDashboard] = useState<DashboardType | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [selectedPeriod, setSelectedPeriod] = useState('week')
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['kpis', 'alerts']))

  useEffect(() => {
    loadDashboard()
  }, [selectedPeriod])

  const loadDashboard = async (refresh = false) => {
    if (refresh) setIsRefreshing(true)
    else setIsLoading(true)

    try {
      const response = await fetch(`/api/analytics/dashboard?period=${selectedPeriod}`)
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to load dashboard')
      }

      const data = await response.json()
      setDashboard(data.dashboard)
      
      if (refresh) {
        show('Dashboard refreshed successfully', 'success')
      }
    } catch (error) {
      console.error('Error loading dashboard:', error)
      show(error instanceof Error ? error.message : 'Failed to load dashboard', 'error')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(section)) {
      newExpanded.delete(section)
    } else {
      newExpanded.add(section)
    }
    setExpandedSections(newExpanded)
  }

  const getKPIIcon = (category: string) => {
    switch (category) {
      case 'quality': return <Target className="w-5 h-5" />
      case 'productivity': return <Activity className="w-5 h-5" />
      case 'efficiency': return <Zap className="w-5 h-5" />
      case 'satisfaction': return <Award className="w-5 h-5" />
      case 'financial': return <DollarSign className="w-5 h-5" />
      default: return <BarChart3 className="w-5 h-5" />
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200'
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  if (isLoading) {
    return (
      <div className={`p-8 ${className}`}>
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner className="w-8 h-8" />
          <span className="ml-3 text-[var(--text-secondary)]">Loading executive dashboard...</span>
        </div>
      </div>
    )
  }

  if (!dashboard) {
    return (
      <div className={`p-8 ${className}`}>
        <div className="text-center py-12">
          <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">
            Dashboard Unavailable
          </h3>
          <p className="text-[var(--text-secondary)] mb-4">
            Unable to load analytics data. Please try again.
          </p>
          <Button onClick={() => loadDashboard()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Executive Dashboard</h1>
          <p className="text-[var(--text-secondary)]">
            {dashboard.period.label} • Last updated {new Date().toLocaleTimeString()}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-3 py-2 border border-[var(--border-light)] rounded-md text-sm"
          >
            <option value="today">Today</option>
            <option value="week">Last 7 Days</option>
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
            <option value="year">This Year</option>
          </select>
          
          <Button variant="outline" size="sm">
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </Button>
          
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          
          <Button 
            onClick={() => loadDashboard(true)} 
            disabled={isRefreshing}
            size="sm"
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

      {/* Key Performance Indicators */}
      <Card className="p-6">
        <button
          onClick={() => toggleSection('kpis')}
          className="w-full flex items-center justify-between text-left mb-4"
        >
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Key Performance Indicators</h2>
          {expandedSections.has('kpis') ? (
            <ChevronUp className="w-5 h-5" />
          ) : (
            <ChevronDown className="w-5 h-5" />
          )}
        </button>
        
        {expandedSections.has('kpis') && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {dashboard.kpis.map((kpi) => (
              <div key={kpi.id} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1 bg-white rounded">
                      {getKPIIcon(kpi.category)}
                    </div>
                    <span className="text-sm font-medium text-[var(--text-primary)]">
                      {kpi.name}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-1 text-sm">
                    {kpi.change !== 0 && (
                      <>
                        {kpi.change > 0 ? (
                          <TrendingUp className="w-3 h-3" />
                        ) : (
                          <TrendingDown className="w-3 h-3" />
                        )}
                        <span
                          style={{ color: getKPITrendColor(kpi) }}
                          className="font-medium"
                        >
                          {Math.abs(kpi.change).toFixed(1)}%
                        </span>
                      </>
                    )}
                  </div>
                </div>
                
                <div className="mb-2">
                  <div className="text-2xl font-bold text-[var(--text-primary)]">
                    {formatKPIValue(kpi)}
                  </div>
                  {kpi.target && (
                    <div className="text-xs text-[var(--text-secondary)]">
                      Target: {formatKPIValue({ ...kpi, value: kpi.target })}
                    </div>
                  )}
                </div>
                
                {kpi.target && (
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-[var(--primary)] h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, calculateTargetProgress(kpi))}%` }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Alerts & Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alerts */}
        <Card className="p-6">
          <button
            onClick={() => toggleSection('alerts')}
            className="w-full flex items-center justify-between text-left mb-4"
          >
            <h2 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Alerts ({dashboard.alerts.length})
            </h2>
            {expandedSections.has('alerts') ? (
              <ChevronUp className="w-5 h-5" />
            ) : (
              <ChevronDown className="w-5 h-5" />
            )}
          </button>
          
          {expandedSections.has('alerts') && (
            <div className="space-y-3">
              {dashboard.alerts.length === 0 ? (
                <div className="text-center py-6 text-[var(--text-secondary)]">
                  <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
                  <p>No active alerts</p>
                </div>
              ) : (
                dashboard.alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-3 border rounded-lg ${getSeverityColor(alert.severity)}`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-lg">{getAlertIcon(alert.type)}</span>
                      <div className="flex-1">
                        <h4 className="font-medium mb-1">{alert.title}</h4>
                        <p className="text-sm mb-2">{alert.description}</p>
                        <p className="text-xs font-medium">Action: {alert.action}</p>
                        <div className="text-xs mt-2 opacity-75">
                          {new Date(alert.createdAt).toLocaleString()}
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {alert.severity}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </Card>

        {/* AI Insights */}
        <Card className="p-6">
          <button
            onClick={() => toggleSection('insights')}
            className="w-full flex items-center justify-between text-left mb-4"
          >
            <h2 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <Brain className="w-5 h-5" />
              AI Insights ({dashboard.insights.length})
            </h2>
            {expandedSections.has('insights') ? (
              <ChevronUp className="w-5 h-5" />
            ) : (
              <ChevronDown className="w-5 h-5" />
            )}
          </button>
          
          {expandedSections.has('insights') && (
            <div className="space-y-3">
              {dashboard.insights.map((insight) => (
                <div key={insight.id} className="p-3 border border-[var(--border-light)] rounded-lg">
                  <div className="flex items-start gap-3">
                    <span className="text-lg">{getInsightIcon(insight.type)}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium">{insight.title}</h4>
                        <Badge variant="outline" className="text-xs">
                          {(insight.confidence * 100).toFixed(0)}% confidence
                        </Badge>
                      </div>
                      <p className="text-sm text-[var(--text-secondary)] mb-2">
                        {insight.description}
                      </p>
                      {insight.recommendations.length > 0 && (
                        <div className="text-xs">
                          <strong>Recommendations:</strong>
                          <ul className="list-disc list-inside mt-1 space-y-1">
                            {insight.recommendations.map((rec, index) => (
                              <li key={index}>{rec}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                    <Badge 
                      variant={insight.impact === 'high' ? 'default' : 'outline'} 
                      className="text-xs"
                    >
                      {insight.impact} impact
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Quality & Performance Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quality Metrics */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
            <Target className="w-5 h-5" />
            Quality Overview
          </h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Average Quality Score</span>
              <span className="text-lg font-bold text-[var(--primary)]">
                {dashboard.qualityMetrics.averageQualityScore.toFixed(1)}
              </span>
            </div>
            
            <div>
              <h4 className="text-sm font-medium mb-2">Quality Distribution</h4>
              <div className="space-y-2">
                {Object.entries(dashboard.qualityMetrics.qualityDistribution).map(([level, percentage]) => (
                  <div key={level} className="flex items-center justify-between">
                    <span className="text-xs capitalize">{level.replace('_', ' ')}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-[var(--primary)] h-2 rounded-full"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium w-8">{percentage}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <h4 className="text-sm font-medium mb-2">Quality Pillars</h4>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(dashboard.qualityMetrics.pillarScores).map(([pillar, score]) => (
                  <div key={pillar} className="p-2 bg-gray-50 rounded text-center">
                    <div className="text-xs capitalize text-[var(--text-secondary)]">
                      {pillar.replace(/([A-Z])/g, ' $1').trim()}
                    </div>
                    <div className="font-semibold">{score.toFixed(1)}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* Productivity Metrics */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Productivity Overview
          </h2>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-gray-50 rounded">
                <div className="text-xs text-[var(--text-secondary)]">Avg Review Time</div>
                <div className="text-lg font-bold">{dashboard.productivityMetrics.avgReviewTime}m</div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded">
                <div className="text-xs text-[var(--text-secondary)]">Daily Throughput</div>
                <div className="text-lg font-bold">{dashboard.productivityMetrics.throughput}</div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded">
                <div className="text-xs text-[var(--text-secondary)]">Approval Rate</div>
                <div className="text-lg font-bold">{dashboard.productivityMetrics.approvalRate.toFixed(1)}%</div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded">
                <div className="text-xs text-[var(--text-secondary)]">Team Utilization</div>
                <div className="text-lg font-bold">{dashboard.productivityMetrics.teamUtilization.toFixed(1)}%</div>
              </div>
            </div>
            
            <div>
              <h4 className="text-sm font-medium mb-2">Workflow Bottlenecks</h4>
              <div className="space-y-2">
                {dashboard.productivityMetrics.bottlenecks.map((bottleneck) => (
                  <div key={bottleneck.stage} className="flex items-center justify-between text-sm">
                    <span>{bottleneck.stage}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[var(--text-secondary)]">{bottleneck.avgTime}m avg</span>
                      <Badge variant="outline" className="text-xs">
                        {bottleneck.fileCount} files
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Team Performance */}
      <Card className="p-6">
        <button
          onClick={() => toggleSection('team')}
          className="w-full flex items-center justify-between text-left mb-4"
        >
          <h2 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <Users className="w-5 h-5" />
            Team Performance
          </h2>
          {expandedSections.has('team') ? (
            <ChevronUp className="w-5 h-5" />
          ) : (
            <ChevronDown className="w-5 h-5" />
          )}
        </button>
        
        {expandedSections.has('team') && (
          <div className="space-y-4">
            {dashboard.teamPerformance.map((member) => (
              <div key={member.userId} className="p-4 border border-[var(--border-light)] rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="font-medium">{member.userName}</h4>
                    <p className="text-sm text-[var(--text-secondary)]">{member.role}</p>
                  </div>
                  <Badge 
                    variant={member.metrics.performance === 'excellent' ? 'success' : 'outline'}
                    className="capitalize"
                  >
                    {member.metrics.performance.replace('_', ' ')}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="text-center">
                    <div className="text-xs text-[var(--text-secondary)]">Files Reviewed</div>
                    <div className="font-semibold">{member.metrics.filesReviewed}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-[var(--text-secondary)]">Quality Score</div>
                    <div className="font-semibold">{member.metrics.avgQualityScore.toFixed(1)}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-[var(--text-secondary)]">Avg Time</div>
                    <div className="font-semibold">{member.metrics.avgReviewTime}m</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-[var(--text-secondary)]">Approval Rate</div>
                    <div className="font-semibold">{member.metrics.approvalRate.toFixed(1)}%</div>
                  </div>
                </div>
                
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-xs text-[var(--text-secondary)]">Specializations:</span>
                  {member.metrics.specializations.map((spec) => (
                    <Badge key={spec} variant="outline" className="text-xs">
                      {spec}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
