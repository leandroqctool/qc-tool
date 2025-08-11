// Business Intelligence and Analytics System
export interface KPIMetric {
  id: string
  name: string
  value: number
  previousValue?: number
  target?: number
  unit: 'percentage' | 'number' | 'currency' | 'time' | 'score'
  trend: 'up' | 'down' | 'stable'
  change: number // percentage change
  period: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'
  category: 'quality' | 'productivity' | 'efficiency' | 'satisfaction' | 'financial'
  description: string
  lastUpdated: Date
}

export interface QualityMetrics {
  averageQualityScore: number
  qualityTrend: 'improving' | 'declining' | 'stable'
  qualityDistribution: {
    excellent: number // 90-100
    good: number // 80-89
    fair: number // 70-79
    poor: number // 60-69
    critical: number // 0-59
  }
  pillarScores: {
    technical: number
    creative: number
    content: number
    brandCompliance: number
  }
  issuesByCategory: {
    [category: string]: {
      count: number
      severity: 'low' | 'medium' | 'high' | 'critical'
      trend: 'up' | 'down' | 'stable'
    }
  }
}

export interface ProductivityMetrics {
  avgReviewTime: number // minutes
  throughput: number // files per day
  approvalRate: number // percentage
  firstPassApprovalRate: number // percentage
  revisionCycles: number // average
  bottlenecks: Array<{
    stage: string
    avgTime: number
    fileCount: number
  }>
  teamUtilization: number // percentage
  peakHours: Array<{
    hour: number
    activity: number
  }>
}

export interface ClientSatisfactionMetrics {
  overallSatisfaction: number // 1-5 scale
  npsScore: number // Net Promoter Score
  clientRetention: number // percentage
  escalationRate: number // percentage
  responseTime: number // hours
  resolutionTime: number // hours
  feedbackByCategory: {
    [category: string]: {
      score: number
      count: number
      trend: 'up' | 'down' | 'stable'
    }
  }
}

export interface FinancialMetrics {
  revenue: number
  costPerFile: number
  profitMargin: number
  clientValue: number
  operationalEfficiency: number
  resourceUtilization: number
}

export interface TeamPerformance {
  userId: string
  userName: string
  role: string
  metrics: {
    filesReviewed: number
    avgQualityScore: number
    avgReviewTime: number
    approvalRate: number
    clientFeedback: number
    productivity: number // files per hour
    specializations: string[]
    workloadCapacity: number // 0-100
    performance: 'excellent' | 'good' | 'average' | 'needs_improvement'
  }
  trends: {
    quality: 'up' | 'down' | 'stable'
    speed: 'up' | 'down' | 'stable'
    volume: 'up' | 'down' | 'stable'
  }
}

export interface ExecutiveDashboard {
  period: {
    start: Date
    end: Date
    label: string
  }
  kpis: KPIMetric[]
  qualityMetrics: QualityMetrics
  productivityMetrics: ProductivityMetrics
  clientMetrics: ClientSatisfactionMetrics
  financialMetrics: FinancialMetrics
  teamPerformance: TeamPerformance[]
  alerts: Array<{
    id: string
    type: 'quality' | 'performance' | 'capacity' | 'client' | 'financial'
    severity: 'low' | 'medium' | 'high' | 'critical'
    title: string
    description: string
    action: string
    createdAt: Date
  }>
  insights: Array<{
    id: string
    type: 'trend' | 'anomaly' | 'opportunity' | 'risk'
    title: string
    description: string
    impact: 'low' | 'medium' | 'high'
    confidence: number // 0-1
    recommendations: string[]
  }>
}

export interface ReportConfig {
  id: string
  name: string
  description: string
  type: 'executive' | 'operational' | 'quality' | 'performance' | 'financial'
  schedule: 'manual' | 'daily' | 'weekly' | 'monthly' | 'quarterly'
  recipients: string[]
  filters: {
    dateRange?: { start: Date; end: Date }
    projects?: string[]
    teams?: string[]
    clients?: string[]
    qualityRange?: { min: number; max: number }
  }
  sections: Array<{
    type: 'kpi' | 'chart' | 'table' | 'text' | 'insights'
    config: Record<string, unknown>
  }>
  format: 'pdf' | 'excel' | 'html' | 'json'
  createdBy: string
  createdAt: Date
  lastGenerated?: Date
}

// Mock data generators for demonstration
export async function generateExecutiveDashboard(
  tenantId: string,
  period: { start: Date; end: Date }
): Promise<ExecutiveDashboard> {
  // Simulate data processing time
  await new Promise(resolve => setTimeout(resolve, 1500))

  const now = new Date()
  const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  // Generate realistic KPIs
  const kpis: KPIMetric[] = [
    {
      id: 'avg_quality_score',
      name: 'Average Quality Score',
      value: 87.3,
      previousValue: 84.1,
      target: 90,
      unit: 'score',
      trend: 'up',
      change: 3.8,
      period: 'weekly',
      category: 'quality',
      description: 'Overall quality score across all files',
      lastUpdated: now
    },
    {
      id: 'approval_rate',
      name: 'First-Pass Approval Rate',
      value: 73.2,
      previousValue: 68.9,
      target: 80,
      unit: 'percentage',
      trend: 'up',
      change: 6.2,
      period: 'weekly',
      category: 'productivity',
      description: 'Files approved without revisions',
      lastUpdated: now
    },
    {
      id: 'avg_review_time',
      name: 'Average Review Time',
      value: 32,
      previousValue: 38,
      target: 30,
      unit: 'time',
      trend: 'up',
      change: -15.8,
      period: 'weekly',
      category: 'efficiency',
      description: 'Time to complete file reviews',
      lastUpdated: now
    },
    {
      id: 'client_satisfaction',
      name: 'Client Satisfaction',
      value: 4.6,
      previousValue: 4.3,
      target: 4.5,
      unit: 'score',
      trend: 'up',
      change: 7.0,
      period: 'weekly',
      category: 'satisfaction',
      description: 'Average client satisfaction rating',
      lastUpdated: now
    },
    {
      id: 'cost_per_file',
      name: 'Cost per File',
      value: 45.30,
      previousValue: 52.10,
      target: 40.00,
      unit: 'currency',
      trend: 'up',
      change: -13.1,
      period: 'weekly',
      category: 'financial',
      description: 'Average cost to process each file',
      lastUpdated: now
    },
    {
      id: 'throughput',
      name: 'Daily Throughput',
      value: 156,
      previousValue: 142,
      target: 160,
      unit: 'number',
      trend: 'up',
      change: 9.9,
      period: 'weekly',
      category: 'productivity',
      description: 'Files processed per day',
      lastUpdated: now
    }
  ]

  // Generate quality metrics
  const qualityMetrics: QualityMetrics = {
    averageQualityScore: 87.3,
    qualityTrend: 'improving',
    qualityDistribution: {
      excellent: 42, // 42% of files
      good: 35,
      fair: 18,
      poor: 4,
      critical: 1
    },
    pillarScores: {
      technical: 91.2,
      creative: 85.7,
      content: 88.1,
      brandCompliance: 84.3
    },
    issuesByCategory: {
      'Grammar & Spelling': {
        count: 23,
        severity: 'medium',
        trend: 'down'
      },
      'Brand Guidelines': {
        count: 18,
        severity: 'high',
        trend: 'stable'
      },
      'Technical Issues': {
        count: 12,
        severity: 'low',
        trend: 'down'
      },
      'Visual Design': {
        count: 15,
        severity: 'medium',
        trend: 'up'
      }
    }
  }

  // Generate productivity metrics
  const productivityMetrics: ProductivityMetrics = {
    avgReviewTime: 32,
    throughput: 156,
    approvalRate: 73.2,
    firstPassApprovalRate: 73.2,
    revisionCycles: 1.4,
    bottlenecks: [
      { stage: 'QC', avgTime: 18, fileCount: 45 },
      { stage: 'R1', avgTime: 12, fileCount: 32 },
      { stage: 'R2', avgTime: 8, fileCount: 18 }
    ],
    teamUtilization: 78.5,
    peakHours: [
      { hour: 9, activity: 85 },
      { hour: 10, activity: 92 },
      { hour: 11, activity: 88 },
      { hour: 14, activity: 79 },
      { hour: 15, activity: 82 }
    ]
  }

  // Generate client satisfaction metrics
  const clientMetrics: ClientSatisfactionMetrics = {
    overallSatisfaction: 4.6,
    npsScore: 67,
    clientRetention: 94.2,
    escalationRate: 2.1,
    responseTime: 1.2,
    resolutionTime: 4.8,
    feedbackByCategory: {
      'Quality': { score: 4.7, count: 89, trend: 'up' },
      'Speed': { score: 4.5, count: 76, trend: 'stable' },
      'Communication': { score: 4.6, count: 82, trend: 'up' },
      'Value': { score: 4.4, count: 71, trend: 'stable' }
    }
  }

  // Generate financial metrics
  const financialMetrics: FinancialMetrics = {
    revenue: 125000,
    costPerFile: 45.30,
    profitMargin: 34.2,
    clientValue: 15600,
    operationalEfficiency: 87.3,
    resourceUtilization: 78.5
  }

  // Generate team performance data
  const teamPerformance: TeamPerformance[] = [
    {
      userId: 'user_1',
      userName: 'Sarah Chen',
      role: 'Senior QC Specialist',
      metrics: {
        filesReviewed: 89,
        avgQualityScore: 92.1,
        avgReviewTime: 28,
        approvalRate: 81.2,
        clientFeedback: 4.8,
        productivity: 3.2,
        specializations: ['Brand Compliance', 'Creative Design'],
        workloadCapacity: 85,
        performance: 'excellent'
      },
      trends: {
        quality: 'up',
        speed: 'up',
        volume: 'stable'
      }
    },
    {
      userId: 'user_2',
      userName: 'Mike Rodriguez',
      role: 'QC Specialist',
      metrics: {
        filesReviewed: 76,
        avgQualityScore: 86.7,
        avgReviewTime: 35,
        approvalRate: 68.4,
        clientFeedback: 4.5,
        productivity: 2.2,
        specializations: ['Technical Review', 'Content Analysis'],
        workloadCapacity: 72,
        performance: 'good'
      },
      trends: {
        quality: 'stable',
        speed: 'up',
        volume: 'down'
      }
    },
    {
      userId: 'user_3',
      userName: 'Emma Thompson',
      role: 'Lead QC Manager',
      metrics: {
        filesReviewed: 45,
        avgQualityScore: 94.3,
        avgReviewTime: 22,
        approvalRate: 88.9,
        clientFeedback: 4.9,
        productivity: 2.0,
        specializations: ['Quality Management', 'Process Optimization'],
        workloadCapacity: 60,
        performance: 'excellent'
      },
      trends: {
        quality: 'up',
        speed: 'stable',
        volume: 'down'
      }
    }
  ]

  // Generate alerts
  const alerts = [
    {
      id: 'alert_1',
      type: 'capacity' as const,
      severity: 'medium' as const,
      title: 'Team Capacity Warning',
      description: 'QC team utilization at 78.5%, approaching capacity limits',
      action: 'Consider hiring additional QC specialists or optimizing workflows',
      createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000)
    },
    {
      id: 'alert_2',
      type: 'quality' as const,
      severity: 'low' as const,
      title: 'Brand Compliance Issues',
      description: 'Increase in brand guideline violations over past 3 days',
      action: 'Schedule brand compliance training session',
      createdAt: new Date(now.getTime() - 6 * 60 * 60 * 1000)
    }
  ]

  // Generate insights
  const insights = [
    {
      id: 'insight_1',
      type: 'opportunity' as const,
      title: 'AI Analysis Adoption',
      description: 'Files with AI pre-analysis show 25% faster review times and higher quality scores',
      impact: 'high' as const,
      confidence: 0.89,
      recommendations: [
        'Encourage all reviewers to use AI analysis',
        'Integrate AI insights into workflow notifications',
        'Track AI usage metrics for performance correlation'
      ]
    },
    {
      id: 'insight_2',
      type: 'trend' as const,
      title: 'Peak Performance Hours',
      description: 'Team productivity peaks between 10-11 AM, suggesting optimal scheduling opportunities',
      impact: 'medium' as const,
      confidence: 0.92,
      recommendations: [
        'Schedule critical reviews during peak hours',
        'Adjust team schedules to maximize peak hour coverage',
        'Consider flexible working arrangements'
      ]
    }
  ]

  return {
    period: {
      start: lastWeek,
      end: now,
      label: 'Last 7 Days'
    },
    kpis,
    qualityMetrics,
    productivityMetrics,
    clientMetrics,
    financialMetrics,
    teamPerformance,
    alerts,
    insights
  }
}

// Utility functions for formatting and calculations
export function formatKPIValue(kpi: KPIMetric): string {
  switch (kpi.unit) {
    case 'percentage':
      return `${kpi.value.toFixed(1)}%`
    case 'currency':
      return `$${kpi.value.toFixed(2)}`
    case 'time':
      return `${Math.floor(kpi.value)}m`
    case 'score':
      return kpi.value.toFixed(1)
    default:
      return kpi.value.toLocaleString()
  }
}

export function getKPITrendColor(kpi: KPIMetric): string {
  if (kpi.change > 0) {
    return kpi.category === 'financial' && kpi.id === 'cost_per_file' 
      ? '#EF4444' // red for cost increase (bad)
      : '#10B981' // green for positive change (good)
  } else if (kpi.change < 0) {
    return kpi.category === 'financial' && kpi.id === 'cost_per_file'
      ? '#10B981' // green for cost decrease (good)
      : '#EF4444' // red for negative change (bad)
  }
  return '#6B7280' // gray for no change
}

export function calculateTargetProgress(kpi: KPIMetric): number {
  if (!kpi.target) return 0
  return Math.min(100, Math.max(0, (kpi.value / kpi.target) * 100))
}

export function getAlertIcon(type: string): string {
  switch (type) {
    case 'quality': return '🎯'
    case 'performance': return '⚡'
    case 'capacity': return '👥'
    case 'client': return '💬'
    case 'financial': return '💰'
    default: return '⚠️'
  }
}

export function getInsightIcon(type: string): string {
  switch (type) {
    case 'trend': return '📈'
    case 'anomaly': return '🔍'
    case 'opportunity': return '💡'
    case 'risk': return '⚠️'
    default: return '💭'
  }
}
