"use client"

import React, { useState, useEffect } from 'react'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { Card } from '../ui/Card'
import { LoadingSpinner } from '../ui/LoadingSpinner'
import { useToast } from '../ui/ToastProvider'
import {
  Brain,
  Target,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  Lightbulb,
  Zap,
  Eye,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Star,
  Award,
  AlertCircle
} from 'lucide-react'
import { 
  type AIAnalysisResult, 
  type QualityScore,
  type AIRecommendation,
  getQualityScoreColor,
  getQualityScoreLabel,
  getRiskColor,
  calculateTimeToReview
} from '../../lib/ai-analysis'

interface AIQualityDashboardProps {
  fileId: string
  fileName: string
  className?: string
  autoAnalyze?: boolean
}

export default function AIQualityDashboard({
  fileId,
  fileName,
  className = '',
  autoAnalyze = false
}: AIQualityDashboardProps) {
  const { show } = useToast()
  const [analysis, setAnalysis] = useState<AIAnalysisResult | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['overview']))

  // Auto-analyze on mount if requested
  useEffect(() => {
    if (autoAnalyze) {
      runAnalysis()
    } else {
      loadCachedAnalysis()
    }
  }, [fileId, autoAnalyze])

  const loadCachedAnalysis = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/ai/analyze?fileId=${fileId}`)
      if (response.ok) {
        const data = await response.json()
        setAnalysis(data.analysis)
      }
    } catch (error) {
      console.error('Error loading cached analysis:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const runAnalysis = async () => {
    setIsAnalyzing(true)
    try {
      const response = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Analysis failed')
      }

      const data = await response.json()
      setAnalysis(data.analysis)
      show('AI analysis completed successfully!', 'success')
    } catch (error) {
      console.error('Error running analysis:', error)
      show(error instanceof Error ? error.message : 'Analysis failed', 'error')
    } finally {
      setIsAnalyzing(false)
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

  const getScoreIcon = (score: number) => {
    if (score >= 90) return <Award className="w-5 h-5 text-green-600" />
    if (score >= 80) return <Star className="w-5 h-5 text-lime-600" />
    if (score >= 70) return <CheckCircle className="w-5 h-5 text-yellow-600" />
    if (score >= 60) return <AlertTriangle className="w-5 h-5 text-orange-600" />
    return <AlertCircle className="w-5 h-5 text-red-600" />
  }

  if (isLoading) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="flex items-center justify-center py-8">
          <LoadingSpinner className="w-8 h-8" />
          <span className="ml-3 text-[var(--text-secondary)]">Loading AI analysis...</span>
        </div>
      </Card>
    )
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-[var(--text-primary)]">AI Quality Analysis</h3>
              <p className="text-sm text-[var(--text-secondary)]">{fileName}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {analysis && (
              <Badge variant="outline" className="text-xs">
                <Clock className="w-3 h-3 mr-1" />
                {calculateTimeToReview(analysis)}
              </Badge>
            )}
            <Button
              onClick={runAnalysis}
              disabled={isAnalyzing}
              size="sm"
              className="flex items-center gap-2"
            >
              {isAnalyzing ? (
                <LoadingSpinner className="w-4 h-4" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              {isAnalyzing ? 'Analyzing...' : 'Analyze'}
            </Button>
          </div>
        </div>
      </Card>

      {analysis ? (
        <>
          {/* Overview */}
          <Card className="p-4">
            <button
              onClick={() => toggleSection('overview')}
              className="w-full flex items-center justify-between text-left"
            >
              <h4 className="font-medium text-[var(--text-primary)]">Quality Overview</h4>
              {expandedSections.has('overview') ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
            
            {expandedSections.has('overview') && (
              <div className="mt-4 space-y-4">
                {/* Overall Score */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    {getScoreIcon(analysis.qualityScore.overall)}
                    <div>
                      <div className="font-semibold text-lg">
                        {analysis.qualityScore.overall}/100
                      </div>
                      <div className="text-sm text-[var(--text-secondary)]">
                        {getQualityScoreLabel(analysis.qualityScore.overall)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-sm text-[var(--text-secondary)]">Confidence</div>
                    <div className="font-medium">
                      {Math.round(analysis.qualityScore.confidence * 100)}%
                    </div>
                  </div>
                </div>

                {/* Risk Assessment */}
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: getRiskColor(analysis.riskAssessment.overallRisk) }}
                    />
                    <span className="font-medium">Risk Level:</span>
                    <span className="capitalize">{analysis.riskAssessment.overallRisk}</span>
                  </div>
                  
                  <div className="text-sm text-[var(--text-secondary)]">
                    {analysis.riskAssessment.timeline.likelyDelay > 0 && (
                      <span>+{analysis.riskAssessment.timeline.likelyDelay}d delay risk</span>
                    )}
                  </div>
                </div>

                {/* Quality Pillars */}
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(analysis.qualityScore.pillars).map(([pillarId, pillar]) => (
                    <div key={pillarId} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium capitalize">
                          {pillarId.replace('_', ' ')}
                        </span>
                        <span 
                          className="text-sm font-semibold"
                          style={{ color: getQualityScoreColor(pillar.score) }}
                        >
                          {pillar.score}
                        </span>
                      </div>
                      
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="h-2 rounded-full transition-all duration-300"
                          style={{
                            width: `${pillar.score}%`,
                            backgroundColor: getQualityScoreColor(pillar.score)
                          }}
                        />
                      </div>
                      
                      {pillar.issues.length > 0 && (
                        <div className="mt-2 text-xs text-[var(--text-secondary)]">
                          {pillar.issues.length} issue{pillar.issues.length !== 1 ? 's' : ''}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>

          {/* Recommendations */}
          {analysis.recommendations.length > 0 && (
            <Card className="p-4">
              <button
                onClick={() => toggleSection('recommendations')}
                className="w-full flex items-center justify-between text-left"
              >
                <div className="flex items-center gap-2">
                  <Lightbulb className="w-4 h-4" />
                  <h4 className="font-medium text-[var(--text-primary)]">
                    AI Recommendations ({analysis.recommendations.length})
                  </h4>
                </div>
                {expandedSections.has('recommendations') ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>
              
              {expandedSections.has('recommendations') && (
                <div className="mt-4 space-y-3">
                  {analysis.recommendations
                    .sort((a, b) => {
                      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
                      return priorityOrder[a.priority] - priorityOrder[b.priority]
                    })
                    .map((rec) => (
                      <div key={rec.id} className="p-3 border rounded-lg">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge 
                                variant={rec.priority === 'critical' || rec.priority === 'high' ? 'destructive' : 'outline'}
                                className="text-xs"
                              >
                                {rec.priority}
                              </Badge>
                              <Badge variant="outline" className="text-xs capitalize">
                                {rec.category}
                              </Badge>
                              {rec.autoFixAvailable && (
                                <Badge variant="success" className="text-xs">
                                  <Zap className="w-3 h-3 mr-1" />
                                  Auto-fix
                                </Badge>
                              )}
                            </div>
                            
                            <h5 className="font-medium text-[var(--text-primary)] mb-1">
                              {rec.title}
                            </h5>
                            <p className="text-sm text-[var(--text-secondary)] mb-2">
                              {rec.description}
                            </p>
                            
                            <div className="flex items-center gap-4 text-xs text-[var(--text-secondary)]">
                              <span>Impact: +{rec.estimatedImpact} points</span>
                              <span>Effort: {rec.estimatedEffort}min</span>
                            </div>
                          </div>
                          
                          {rec.actionable && (
                            <Button size="sm" variant="outline" className="ml-3">
                              {rec.autoFixAvailable ? 'Auto Fix' : 'Review'}
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </Card>
          )}

          {/* Content Analysis */}
          <Card className="p-4">
            <button
              onClick={() => toggleSection('content')}
              className="w-full flex items-center justify-between text-left"
            >
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4" />
                <h4 className="font-medium text-[var(--text-primary)]">Content Analysis</h4>
              </div>
              {expandedSections.has('content') ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
            
            {expandedSections.has('content') && (
              <div className="mt-4 space-y-4">
                {/* Text Quality */}
                <div>
                  <h5 className="font-medium mb-3">Text Quality</h5>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="text-sm text-[var(--text-secondary)]">Grammar</div>
                      <div className="font-semibold">{analysis.contentAnalysis.textQuality.grammar}/100</div>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="text-sm text-[var(--text-secondary)]">Spelling</div>
                      <div className="font-semibold">{analysis.contentAnalysis.textQuality.spelling}/100</div>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="text-sm text-[var(--text-secondary)]">Readability</div>
                      <div className="font-semibold">{analysis.contentAnalysis.textQuality.readability}/100</div>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="text-sm text-[var(--text-secondary)]">Tone</div>
                      <div className="font-semibold capitalize">{analysis.contentAnalysis.textQuality.tone}</div>
                    </div>
                  </div>
                  
                  {analysis.contentAnalysis.textQuality.wordCount > 0 && (
                    <div className="mt-2 text-sm text-[var(--text-secondary)]">
                      Word count: {analysis.contentAnalysis.textQuality.wordCount.toLocaleString()}
                    </div>
                  )}
                </div>

                {/* Visual Elements */}
                {analysis.contentAnalysis.visualElements && (
                  <div>
                    <h5 className="font-medium mb-3">Visual Elements</h5>
                    <div className="grid grid-cols-2 gap-3">
                      {Object.entries(analysis.contentAnalysis.visualElements).map(([key, value]) => (
                        <div key={key} className="p-3 bg-gray-50 rounded-lg">
                          <div className="text-sm text-[var(--text-secondary)] capitalize">
                            {key.replace(/([A-Z])/g, ' $1').trim()}
                          </div>
                          <div className="font-semibold">{Math.round(value)}/100</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* Brand Compliance */}
          <Card className="p-4">
            <button
              onClick={() => toggleSection('brand')}
              className="w-full flex items-center justify-between text-left"
            >
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4" />
                <h4 className="font-medium text-[var(--text-primary)]">Brand Compliance</h4>
              </div>
              {expandedSections.has('brand') ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
            
            {expandedSections.has('brand') && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-4">
                  <span className="font-medium">Overall Compliance</span>
                  <span 
                    className="font-semibold text-lg"
                    style={{ color: getQualityScoreColor(analysis.brandCompliance.overall) }}
                  >
                    {analysis.brandCompliance.overall}/100
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(analysis.brandCompliance.brandElements).map(([key, value]) => (
                    <div key={key} className="p-3 bg-gray-50 rounded-lg">
                      <div className="text-sm text-[var(--text-secondary)] capitalize">{key}</div>
                      <div className="font-semibold">{value}/100</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </>
      ) : (
        <Card className="p-8 text-center">
          <Brain className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="font-medium text-[var(--text-primary)] mb-2">
            AI Analysis Ready
          </h3>
          <p className="text-[var(--text-secondary)] mb-4">
            Get intelligent quality insights and recommendations for this file.
          </p>
          <Button onClick={runAnalysis} disabled={isAnalyzing}>
            {isAnalyzing ? (
              <>
                <LoadingSpinner className="w-4 h-4 mr-2" />
                Analyzing...
              </>
            ) : (
              <>
                <Brain className="w-4 h-4 mr-2" />
                Start AI Analysis
              </>
            )}
          </Button>
        </Card>
      )}
    </div>
  )
}
