"use client"

import React, { useState, useEffect } from 'react'
import { Card } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { 
  Brain, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Target,
  Zap,
  BarChart3
} from 'lucide-react'

interface AIInsightsProps {
  className?: string
  tenantId?: string
}

interface AIInsight {
  id: string
  type: 'trend' | 'alert' | 'recommendation' | 'achievement'
  title: string
  description: string
  value?: string
  change?: number
  priority: 'low' | 'medium' | 'high'
  actionable: boolean
}

export default function AIInsights({ className = '' }: AIInsightsProps) {
  const [insights, setInsights] = useState<AIInsight[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Mock AI insights - in production, these would come from real analytics
    const mockInsights: AIInsight[] = [
      {
        id: '1',
        type: 'trend',
        title: 'Quality Score Improving',
        description: 'Average file quality has increased by 12% this week',
        value: '87/100',
        change: 12,
        priority: 'medium',
        actionable: false
      },
      {
        id: '2',
        type: 'alert',
        title: 'Brand Compliance Issues',
        description: '3 files this week failed brand guidelines compliance',
        value: '3 files',
        priority: 'high',
        actionable: true
      },
      {
        id: '3',
        type: 'recommendation',
        title: 'Optimize Review Process',
        description: 'Files with AI pre-analysis complete 25% faster',
        value: '25% faster',
        priority: 'medium',
        actionable: true
      },
      {
        id: '4',
        type: 'achievement',
        title: 'Zero Critical Issues',
        description: 'No critical quality issues detected in the last 7 days',
        priority: 'low',
        actionable: false
      },
      {
        id: '5',
        type: 'trend',
        title: 'Review Time Decreasing',
        description: 'Average review time reduced by 18 minutes',
        value: '32 min avg',
        change: -18,
        priority: 'medium',
        actionable: false
      }
    ]

    setTimeout(() => {
      setInsights(mockInsights)
      setIsLoading(false)
    }, 1000)
  }, [])

  const getInsightIcon = (type: AIInsight['type'], priority: AIInsight['priority']) => {
    switch (type) {
      case 'trend':
        return <TrendingUp className="w-4 h-4 text-blue-600" />
      case 'alert':
        return <AlertTriangle className={`w-4 h-4 ${priority === 'high' ? 'text-red-600' : 'text-yellow-600'}`} />
      case 'recommendation':
        return <Zap className="w-4 h-4 text-purple-600" />
      case 'achievement':
        return <CheckCircle className="w-4 h-4 text-green-600" />
      default:
        return <Brain className="w-4 h-4 text-gray-600" />
    }
  }

  const getPriorityColor = (priority: AIInsight['priority']) => {
    switch (priority) {
      case 'high': return 'destructive'
      case 'medium': return 'default'
      case 'low': return 'outline'
      default: return 'outline'
    }
  }

  if (isLoading) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-[var(--text-primary)]">AI Insights</h3>
            <p className="text-sm text-[var(--text-secondary)]">Analyzing quality trends...</p>
          </div>
        </div>
        
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-3 bg-gray-100 rounded-lg animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
              <div className="h-3 bg-gray-200 rounded w-1/2" />
            </div>
          ))}
        </div>
      </Card>
    )
  }

  return (
    <Card className={`p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-[var(--text-primary)]">AI Insights</h3>
            <p className="text-sm text-[var(--text-secondary)]">Smart quality analytics</p>
          </div>
        </div>
        
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4" />
          View All
        </Button>
      </div>

      {/* Insights List */}
      <div className="space-y-3">
        {insights.map((insight) => (
          <div key={insight.id} className="p-3 border rounded-lg hover:bg-gray-50 transition-colors">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3 flex-1">
                {getInsightIcon(insight.type, insight.priority)}
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-[var(--text-primary)] text-sm">
                      {insight.title}
                    </h4>
                    <Badge 
                      variant={getPriorityColor(insight.priority)} 
                      className="text-xs"
                    >
                      {insight.priority}
                    </Badge>
                  </div>
                  
                  <p className="text-sm text-[var(--text-secondary)] mb-2">
                    {insight.description}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    {insight.value && (
                      <div className="flex items-center gap-1">
                        <span className="font-semibold text-sm">{insight.value}</span>
                        {insight.change && (
                          <span className={`text-xs flex items-center gap-1 ${
                            insight.change > 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {insight.change > 0 ? (
                              <TrendingUp className="w-3 h-3" />
                            ) : (
                              <TrendingDown className="w-3 h-3" />
                            )}
                            {Math.abs(insight.change)}
                          </span>
                        )}
                      </div>
                    )}
                    
                    {insight.actionable && (
                      <Button variant="ghost" size="sm" className="text-xs">
                        Take Action
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Stats */}
      <div className="mt-4 pt-4 border-t border-[var(--border-light)] grid grid-cols-3 gap-4">
        <div className="text-center">
          <div className="text-lg font-semibold text-[var(--text-primary)]">87</div>
          <div className="text-xs text-[var(--text-secondary)]">Avg Quality</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-semibold text-[var(--text-primary)]">32m</div>
          <div className="text-xs text-[var(--text-secondary)]">Avg Review</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-semibold text-[var(--text-primary)]">94%</div>
          <div className="text-xs text-[var(--text-secondary)]">Success Rate</div>
        </div>
      </div>

      {/* Last Updated */}
      <div className="mt-3 pt-3 border-t border-[var(--border-light)] flex items-center justify-center text-xs text-[var(--text-secondary)]">
        <Clock className="w-3 h-3 mr-1" />
        Updated 5 minutes ago
      </div>
    </Card>
  )
}
