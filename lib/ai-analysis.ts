// AI-powered quality analysis system
export interface QualityPillar {
  id: string
  name: string
  description: string
  weight: number // 0-1, how much this pillar affects overall score
  criteria: QualityCriterion[]
}

export interface QualityCriterion {
  id: string
  name: string
  description: string
  weight: number
  checkType: 'technical' | 'creative' | 'content' | 'process'
  automatable: boolean
}

export interface QualityScore {
  overall: number // 0-100
  pillars: {
    [pillarId: string]: {
      score: number
      maxScore: number
      issues: QualityIssue[]
      recommendations: string[]
    }
  }
  confidence: number // 0-1, how confident we are in this score
  analysisTime: Date
  version: string
}

export interface QualityIssue {
  id: string
  pillarId: string
  criterionId: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description: string
  location?: {
    x?: number
    y?: number
    page?: number
    element?: string
  }
  autoDetected: boolean
  fixSuggestion?: string
  estimatedFixTime?: number // minutes
}

export interface AIAnalysisResult {
  fileId: string
  fileName: string
  fileType: string
  qualityScore: QualityScore
  contentAnalysis: ContentAnalysis
  brandCompliance: BrandComplianceScore
  technicalAnalysis: TechnicalAnalysis
  recommendations: AIRecommendation[]
  riskAssessment: RiskAssessment
  estimatedReviewTime: number // minutes
  suggestedReviewers: string[]
}

export interface ContentAnalysis {
  textQuality: {
    grammar: number // 0-100
    spelling: number // 0-100
    readability: number // 0-100
    tone: 'professional' | 'casual' | 'formal' | 'creative' | 'technical'
    wordCount: number
    issues: Array<{
      type: 'grammar' | 'spelling' | 'style' | 'clarity'
      text: string
      suggestion: string
      position?: number
    }>
  }
  visualElements?: {
    imageQuality: number // 0-100
    colorConsistency: number // 0-100
    typography: number // 0-100
    layout: number // 0-100
    accessibility: number // 0-100
  }
}

export interface BrandComplianceScore {
  overall: number // 0-100
  guidelines: {
    [guidelineId: string]: {
      score: number
      violations: Array<{
        type: string
        description: string
        severity: 'low' | 'medium' | 'high'
        location?: string
      }>
    }
  }
  brandElements: {
    logo: number
    colors: number
    fonts: number
    messaging: number
    imagery: number
  }
}

export interface TechnicalAnalysis {
  fileFormat: {
    valid: boolean
    optimized: boolean
    issues: string[]
  }
  resolution: {
    adequate: boolean
    dpi?: number
    dimensions?: { width: number; height: number }
    recommendations: string[]
  }
  fileSize: {
    appropriate: boolean
    sizeBytes: number
    recommendations: string[]
  }
  metadata: {
    complete: boolean
    missing: string[]
  }
}

export interface AIRecommendation {
  id: string
  type: 'fix' | 'enhancement' | 'optimization' | 'compliance'
  priority: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description: string
  estimatedImpact: number // 0-100, how much this would improve quality
  estimatedEffort: number // minutes
  category: 'technical' | 'creative' | 'content' | 'process'
  actionable: boolean
  autoFixAvailable?: boolean
}

export interface RiskAssessment {
  overallRisk: 'low' | 'medium' | 'high' | 'critical'
  factors: Array<{
    factor: string
    risk: 'low' | 'medium' | 'high' | 'critical'
    description: string
    mitigation: string
  }>
  timeline: {
    likelyDelay: number // days
    confidence: number // 0-1
  }
  qualityRisk: {
    clientRejection: number // 0-1 probability
    revisionCycles: number // estimated number
    reputationImpact: 'none' | 'minor' | 'moderate' | 'significant'
  }
}

// Default quality pillars for QC analysis
export const DEFAULT_QUALITY_PILLARS: QualityPillar[] = [
  {
    id: 'technical',
    name: 'Technical Quality',
    description: 'File format, resolution, technical specifications',
    weight: 0.25,
    criteria: [
      {
        id: 'file_format',
        name: 'File Format',
        description: 'Correct format for intended use',
        weight: 0.3,
        checkType: 'technical',
        automatable: true
      },
      {
        id: 'resolution',
        name: 'Resolution & Quality',
        description: 'Appropriate resolution and image quality',
        weight: 0.4,
        checkType: 'technical',
        automatable: true
      },
      {
        id: 'file_size',
        name: 'File Size Optimization',
        description: 'Optimized for delivery method',
        weight: 0.3,
        checkType: 'technical',
        automatable: true
      }
    ]
  },
  {
    id: 'creative',
    name: 'Creative Excellence',
    description: 'Visual design, layout, aesthetic quality',
    weight: 0.3,
    criteria: [
      {
        id: 'visual_hierarchy',
        name: 'Visual Hierarchy',
        description: 'Clear information hierarchy and flow',
        weight: 0.25,
        checkType: 'creative',
        automatable: false
      },
      {
        id: 'color_harmony',
        name: 'Color Harmony',
        description: 'Effective color usage and contrast',
        weight: 0.25,
        checkType: 'creative',
        automatable: true
      },
      {
        id: 'typography',
        name: 'Typography',
        description: 'Font selection and text treatment',
        weight: 0.25,
        checkType: 'creative',
        automatable: true
      },
      {
        id: 'composition',
        name: 'Composition',
        description: 'Overall layout and balance',
        weight: 0.25,
        checkType: 'creative',
        automatable: false
      }
    ]
  },
  {
    id: 'content',
    name: 'Content Quality',
    description: 'Text accuracy, messaging, information quality',
    weight: 0.25,
    criteria: [
      {
        id: 'grammar_spelling',
        name: 'Grammar & Spelling',
        description: 'Correct grammar and spelling',
        weight: 0.4,
        checkType: 'content',
        automatable: true
      },
      {
        id: 'messaging_clarity',
        name: 'Message Clarity',
        description: 'Clear and effective communication',
        weight: 0.3,
        checkType: 'content',
        automatable: false
      },
      {
        id: 'factual_accuracy',
        name: 'Factual Accuracy',
        description: 'Correct information and data',
        weight: 0.3,
        checkType: 'content',
        automatable: false
      }
    ]
  },
  {
    id: 'brand_compliance',
    name: 'Brand Compliance',
    description: 'Adherence to brand guidelines and standards',
    weight: 0.2,
    criteria: [
      {
        id: 'brand_guidelines',
        name: 'Brand Guidelines',
        description: 'Follows established brand standards',
        weight: 0.4,
        checkType: 'process',
        automatable: true
      },
      {
        id: 'logo_usage',
        name: 'Logo Usage',
        description: 'Correct logo placement and treatment',
        weight: 0.3,
        checkType: 'process',
        automatable: true
      },
      {
        id: 'tone_voice',
        name: 'Tone & Voice',
        description: 'Consistent brand voice and messaging',
        weight: 0.3,
        checkType: 'content',
        automatable: false
      }
    ]
  }
]

// Mock AI analysis functions (in production, these would call actual AI services)
export async function analyzeFileQuality(
  fileId: string,
  fileName: string,
  fileUrl: string,
  mimeType: string,
  tenantId: string
): Promise<AIAnalysisResult> {
  // Simulate AI processing time
  await new Promise(resolve => setTimeout(resolve, 2000))

  // Mock analysis based on file type
  const isImage = mimeType.startsWith('image/')
  const isPDF = mimeType.includes('pdf')
  const isDocument = mimeType.includes('document') || mimeType.includes('text')

  const qualityScore = generateMockQualityScore(isImage, isPDF, isDocument)
  const contentAnalysis = generateMockContentAnalysis(isDocument, isPDF)
  const brandCompliance = generateMockBrandCompliance()
  const technicalAnalysis = generateMockTechnicalAnalysis(mimeType)
  const recommendations = generateMockRecommendations(qualityScore)
  const riskAssessment = generateMockRiskAssessment(qualityScore.overall)

  return {
    fileId,
    fileName,
    fileType: mimeType,
    qualityScore,
    contentAnalysis,
    brandCompliance,
    technicalAnalysis,
    recommendations,
    riskAssessment,
    estimatedReviewTime: Math.round(15 + (100 - qualityScore.overall) * 0.5),
    suggestedReviewers: ['senior_designer', 'brand_manager', 'copywriter'].slice(0, Math.ceil(Math.random() * 3))
  }
}

function generateMockQualityScore(isImage: boolean, isPDF: boolean, isDocument: boolean): QualityScore {
  const baseScore = 65 + Math.random() * 30 // 65-95 range

  const pillars: QualityScore['pillars'] = {}

  DEFAULT_QUALITY_PILLARS.forEach(pillar => {
    const pillarScore = Math.max(0, Math.min(100, baseScore + (Math.random() - 0.5) * 20))
    const issues: QualityIssue[] = []
    const recommendations: string[] = []

    // Generate issues based on score
    if (pillarScore < 80) {
      pillar.criteria.forEach(criterion => {
        if (Math.random() > pillarScore / 100) {
          issues.push({
            id: `issue_${criterion.id}_${Date.now()}`,
            pillarId: pillar.id,
            criterionId: criterion.id,
            severity: pillarScore < 50 ? 'high' : pillarScore < 70 ? 'medium' : 'low',
            title: `${criterion.name} Issue`,
            description: `${criterion.description} needs attention`,
            autoDetected: criterion.automatable,
            fixSuggestion: `Improve ${criterion.name.toLowerCase()}`,
            estimatedFixTime: Math.round(5 + Math.random() * 25)
          })
        }
      })
    }

    // Generate recommendations
    if (pillarScore < 90) {
      recommendations.push(`Consider enhancing ${pillar.name.toLowerCase()} aspects`)
    }

    pillars[pillar.id] = {
      score: Math.round(pillarScore),
      maxScore: 100,
      issues,
      recommendations
    }
  })

  return {
    overall: Math.round(Object.values(pillars).reduce((sum, p) => sum + p.score, 0) / Object.keys(pillars).length),
    pillars,
    confidence: 0.75 + Math.random() * 0.2,
    analysisTime: new Date(),
    version: '1.0.0'
  }
}

function generateMockContentAnalysis(isDocument: boolean, isPDF: boolean): ContentAnalysis {
  const hasText = isDocument || isPDF

  return {
    textQuality: {
      grammar: hasText ? 75 + Math.random() * 20 : 100,
      spelling: hasText ? 80 + Math.random() * 15 : 100,
      readability: hasText ? 70 + Math.random() * 25 : 100,
      tone: (['professional', 'casual', 'formal', 'creative', 'technical'] as const)[Math.floor(Math.random() * 5)],
      wordCount: hasText ? Math.round(50 + Math.random() * 500) : 0,
      issues: hasText ? [
        {
          type: 'grammar' as const,
          text: 'Example grammar issue',
          suggestion: 'Suggested correction',
          position: Math.round(Math.random() * 100)
        }
      ] : []
    },
    visualElements: {
      imageQuality: 80 + Math.random() * 15,
      colorConsistency: 75 + Math.random() * 20,
      typography: 85 + Math.random() * 10,
      layout: 70 + Math.random() * 25,
      accessibility: 65 + Math.random() * 30
    }
  }
}

function generateMockBrandCompliance(): BrandComplianceScore {
  const overallScore = 70 + Math.random() * 25

  return {
    overall: Math.round(overallScore),
    guidelines: {
      color_palette: {
        score: Math.round(overallScore + (Math.random() - 0.5) * 20),
        violations: []
      },
      typography: {
        score: Math.round(overallScore + (Math.random() - 0.5) * 20),
        violations: []
      }
    },
    brandElements: {
      logo: Math.round(overallScore + (Math.random() - 0.5) * 15),
      colors: Math.round(overallScore + (Math.random() - 0.5) * 15),
      fonts: Math.round(overallScore + (Math.random() - 0.5) * 15),
      messaging: Math.round(overallScore + (Math.random() - 0.5) * 15),
      imagery: Math.round(overallScore + (Math.random() - 0.5) * 15)
    }
  }
}

function generateMockTechnicalAnalysis(mimeType: string): TechnicalAnalysis {
  const isOptimized = Math.random() > 0.3

  return {
    fileFormat: {
      valid: true,
      optimized: isOptimized,
      issues: isOptimized ? [] : ['File could be better optimized for web delivery']
    },
    resolution: {
      adequate: true,
      dpi: mimeType.startsWith('image/') ? 150 + Math.random() * 150 : undefined,
      dimensions: mimeType.startsWith('image/') ? 
        { width: 800 + Math.random() * 1200, height: 600 + Math.random() * 800 } : undefined,
      recommendations: isOptimized ? [] : ['Consider higher resolution for print materials']
    },
    fileSize: {
      appropriate: isOptimized,
      sizeBytes: Math.round(100000 + Math.random() * 5000000),
      recommendations: isOptimized ? [] : ['File size could be optimized']
    },
    metadata: {
      complete: Math.random() > 0.4,
      missing: Math.random() > 0.4 ? [] : ['Author information', 'Creation date', 'Copyright info']
    }
  }
}

function generateMockRecommendations(qualityScore: QualityScore): AIRecommendation[] {
  const recommendations: AIRecommendation[] = []
  const overallScore = qualityScore.overall

  if (overallScore < 80) {
    recommendations.push({
      id: 'rec_improve_quality',
      type: 'enhancement',
      priority: overallScore < 60 ? 'high' : 'medium',
      title: 'Improve Overall Quality',
      description: 'Focus on areas with lower scores to enhance overall quality',
      estimatedImpact: Math.round((80 - overallScore) * 0.8),
      estimatedEffort: Math.round(30 + (80 - overallScore) * 2),
      category: 'process',
      actionable: true
    })
  }

  if (qualityScore.pillars.technical?.score < 75) {
    recommendations.push({
      id: 'rec_technical_fixes',
      type: 'fix',
      priority: 'high',
      title: 'Address Technical Issues',
      description: 'Fix file format, resolution, and optimization issues',
      estimatedImpact: 15,
      estimatedEffort: 20,
      category: 'technical',
      actionable: true,
      autoFixAvailable: true
    })
  }

  if (qualityScore.pillars.content?.score < 70) {
    recommendations.push({
      id: 'rec_content_review',
      type: 'fix',
      priority: 'medium',
      title: 'Content Review Required',
      description: 'Review and correct grammar, spelling, and messaging issues',
      estimatedImpact: 12,
      estimatedEffort: 45,
      category: 'content',
      actionable: true
    })
  }

  return recommendations
}

function generateMockRiskAssessment(overallScore: number): RiskAssessment {
  const riskLevel = overallScore > 80 ? 'low' : overallScore > 60 ? 'medium' : 'high'

  return {
    overallRisk: riskLevel,
    factors: [
      {
        factor: 'Quality Score',
        risk: riskLevel,
        description: `Overall quality score of ${overallScore}`,
        mitigation: 'Address identified issues before final approval'
      }
    ],
    timeline: {
      likelyDelay: overallScore > 80 ? 0 : overallScore > 60 ? 1 : 2,
      confidence: 0.7 + (overallScore / 100) * 0.2
    },
    qualityRisk: {
      clientRejection: (100 - overallScore) / 200, // 0-0.5 based on score
      revisionCycles: overallScore > 80 ? 1 : overallScore > 60 ? 2 : 3,
      reputationImpact: overallScore > 80 ? 'none' : overallScore > 60 ? 'minor' : 'moderate'
    }
  }
}

// Utility functions
export function getQualityScoreColor(score: number): string {
  if (score >= 90) return '#10B981' // green-500
  if (score >= 80) return '#84CC16' // lime-500  
  if (score >= 70) return '#F59E0B' // yellow-500
  if (score >= 60) return '#F97316' // orange-500
  return '#EF4444' // red-500
}

export function getQualityScoreLabel(score: number): string {
  if (score >= 90) return 'Excellent'
  if (score >= 80) return 'Good'
  if (score >= 70) return 'Fair'
  if (score >= 60) return 'Poor'
  return 'Critical'
}

export function getRiskColor(risk: RiskAssessment['overallRisk']): string {
  switch (risk) {
    case 'low': return '#10B981' // green-500
    case 'medium': return '#F59E0B' // yellow-500
    case 'high': return '#F97316' // orange-500
    case 'critical': return '#EF4444' // red-500
  }
}

export function calculateTimeToReview(analysis: AIAnalysisResult): string {
  const minutes = analysis.estimatedReviewTime
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`
}
