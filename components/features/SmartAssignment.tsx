"use client"

import React, { useState } from 'react'
import { Card } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { LoadingSpinner } from '../ui/LoadingSpinner'
import { useToast } from '../ui/ToastProvider'
import {
  Brain,
  Users,
  Clock,
  Target,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Star,
  Activity,
  Zap,
  Award,
  User,
  Calendar,
  BarChart3
} from 'lucide-react'
import {
  type AssignmentRecommendation,
  type SmartAssignmentRequest
} from '../../lib/team-management'

interface SmartAssignmentProps {
  fileId: string
  projectId: string
  clientId: string
  fileType: string
  onAssign?: (memberId: string, memberName: string) => void
  className?: string
}

export default function SmartAssignment({
  fileId,
  projectId,
  clientId,
  fileType,
  onAssign,
  className = ''
}: SmartAssignmentProps) {
  const { show } = useToast()
  const [recommendations, setRecommendations] = useState<AssignmentRecommendation[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isAssigning, setIsAssigning] = useState<string | null>(null)
  const [assignmentRequest, setAssignmentRequest] = useState<Partial<SmartAssignmentRequest>>({
    estimatedComplexity: 'moderate',
    estimatedTimeMinutes: 30,
    urgency: 'medium',
    requiredSkills: []
  })

  const generateRecommendations = async () => {
    setIsLoading(true)
    try {
      const request: SmartAssignmentRequest = {
        fileId,
        projectId,
        clientId,
        fileType,
        estimatedComplexity: assignmentRequest.estimatedComplexity || 'moderate',
        estimatedTimeMinutes: assignmentRequest.estimatedTimeMinutes || 30,
        urgency: assignmentRequest.urgency || 'medium',
        requiredSkills: assignmentRequest.requiredSkills || []
      }

      const response = await fetch('/api/team/assignments/smart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to generate recommendations')
      }

      const data = await response.json()
      setRecommendations(data.recommendations || [])
      
      if (data.recommendations.length === 0) {
        show('No suitable team members found for this assignment', 'info')
      } else {
        show(`Generated ${data.recommendations.length} assignment recommendations`, 'success')
      }
    } catch (error) {
      console.error('Error generating recommendations:', error)
      show(error instanceof Error ? error.message : 'Failed to generate recommendations', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAssign = async (recommendation: AssignmentRecommendation) => {
    if (isAssigning) return
    
    setIsAssigning(recommendation.memberId)
    try {
      // In a real implementation, you would call an API to assign the file
      await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate API call
      
      show(`File assigned to ${recommendation.memberName}`, 'success')
      onAssign?.(recommendation.memberId, recommendation.memberName)
    } catch (error) {
      console.error('Error assigning file:', error)
      show('Failed to assign file', 'error')
    } finally {
      setIsAssigning(null)
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600'
    if (score >= 80) return 'text-blue-600'
    if (score >= 70) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'bg-green-100 text-green-800'
    if (confidence >= 0.8) return 'bg-blue-100 text-blue-800'
    if (confidence >= 0.7) return 'bg-yellow-100 text-yellow-800'
    return 'bg-red-100 text-red-800'
  }

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical': return 'bg-red-100 text-red-800'
      case 'high': return 'bg-orange-100 text-orange-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getComplexityIcon = (complexity: string) => {
    switch (complexity) {
      case 'simple': return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'moderate': return <Activity className="w-4 h-4 text-blue-500" />
      case 'complex': return <Target className="w-4 h-4 text-orange-500" />
      case 'expert': return <Star className="w-4 h-4 text-red-500" />
      default: return <Activity className="w-4 h-4 text-gray-500" />
    }
  }

  return (
    <Card className={`p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Brain className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-[var(--text-primary)]">Smart Assignment</h3>
            <p className="text-sm text-[var(--text-secondary)]">
              AI-powered team member recommendations
            </p>
          </div>
        </div>
      </div>

      {/* Assignment Parameters */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-medium mb-3">Assignment Parameters</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              Complexity
            </label>
            <select
              value={assignmentRequest.estimatedComplexity}
              onChange={(e) => setAssignmentRequest({
                ...assignmentRequest,
                estimatedComplexity: e.target.value as 'simple' | 'moderate' | 'complex' | 'expert'
              })}
              className="w-full px-3 py-2 border border-[var(--border-light)] rounded-md text-sm"
            >
              <option value="simple">Simple</option>
              <option value="moderate">Moderate</option>
              <option value="complex">Complex</option>
              <option value="expert">Expert</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              Estimated Time (minutes)
            </label>
            <input
              type="number"
              value={assignmentRequest.estimatedTimeMinutes}
              onChange={(e) => setAssignmentRequest({
                ...assignmentRequest,
                estimatedTimeMinutes: parseInt(e.target.value) || 30
              })}
              className="w-full px-3 py-2 border border-[var(--border-light)] rounded-md text-sm"
              min="5"
              max="480"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              Urgency
            </label>
            <select
              value={assignmentRequest.urgency}
              onChange={(e) => setAssignmentRequest({
                ...assignmentRequest,
                urgency: e.target.value as 'low' | 'medium' | 'high' | 'critical'
              })}
              className="w-full px-3 py-2 border border-[var(--border-light)] rounded-md text-sm"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>

          <div className="flex items-end">
            <Button
              onClick={generateRecommendations}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? (
                <LoadingSpinner className="w-4 h-4 mr-2" />
              ) : (
                <Brain className="w-4 h-4 mr-2" />
              )}
              Generate
            </Button>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Recommended Assignments</h4>
            <Badge variant="outline" className="text-xs">
              {recommendations.length} recommendations
            </Badge>
          </div>

          {recommendations.map((rec, index) => (
            <div key={rec.memberId} className="p-4 border border-[var(--border-light)] rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium">
                      {rec.memberName.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <div>
                    <h5 className="font-medium text-[var(--text-primary)]">{rec.memberName}</h5>
                    <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                      <Badge className={getConfidenceColor(rec.confidence)} variant="outline">
                        {(rec.confidence * 100).toFixed(0)}% confidence
                      </Badge>
                      {index === 0 && (
                        <Badge className="bg-blue-100 text-blue-800" variant="outline">
                          Best Match
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <Button
                  onClick={() => handleAssign(rec)}
                  disabled={!!isAssigning}
                  size="sm"
                >
                  {isAssigning === rec.memberId ? (
                    <LoadingSpinner className="w-4 h-4 mr-2" />
                  ) : (
                    <User className="w-4 h-4 mr-2" />
                  )}
                  Assign
                </Button>
              </div>

              {/* Score Breakdown */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-3">
                <div className="text-center">
                  <div className={`text-lg font-bold ${getScoreColor(rec.scores.skillMatch)}`}>
                    {rec.scores.skillMatch.toFixed(0)}
                  </div>
                  <div className="text-xs text-[var(--text-secondary)]">Skills</div>
                </div>
                <div className="text-center">
                  <div className={`text-lg font-bold ${getScoreColor(rec.scores.availability)}`}>
                    {rec.scores.availability.toFixed(0)}
                  </div>
                  <div className="text-xs text-[var(--text-secondary)]">Available</div>
                </div>
                <div className="text-center">
                  <div className={`text-lg font-bold ${getScoreColor(rec.scores.performance)}`}>
                    {rec.scores.performance.toFixed(0)}
                  </div>
                  <div className="text-xs text-[var(--text-secondary)]">Performance</div>
                </div>
                <div className="text-center">
                  <div className={`text-lg font-bold ${getScoreColor(rec.scores.workloadBalance)}`}>
                    {rec.scores.workloadBalance.toFixed(0)}
                  </div>
                  <div className="text-xs text-[var(--text-secondary)]">Workload</div>
                </div>
                <div className="text-center">
                  <div className={`text-lg font-bold ${getScoreColor(rec.scores.pastExperience)}`}>
                    {rec.scores.pastExperience.toFixed(0)}
                  </div>
                  <div className="text-xs text-[var(--text-secondary)]">Experience</div>
                </div>
                <div className="text-center">
                  <div className={`text-lg font-bold ${getScoreColor(rec.scores.overall)}`}>
                    {rec.scores.overall.toFixed(0)}
                  </div>
                  <div className="text-xs text-[var(--text-secondary)]">Overall</div>
                </div>
              </div>

              {/* Reasoning */}
              {rec.reasoning.length > 0 && (
                <div className="mb-3">
                  <div className="text-sm font-medium text-green-700 mb-1">Strengths:</div>
                  <ul className="text-sm text-green-600 space-y-1">
                    {rec.reasoning.map((reason, i) => (
                      <li key={i} className="flex items-center">
                        <CheckCircle className="w-3 h-3 mr-2" />
                        {reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Warnings */}
              {rec.warnings.length > 0 && (
                <div className="mb-3">
                  <div className="text-sm font-medium text-yellow-700 mb-1">Considerations:</div>
                  <ul className="text-sm text-yellow-600 space-y-1">
                    {rec.warnings.map((warning, i) => (
                      <li key={i} className="flex items-center">
                        <AlertTriangle className="w-3 h-3 mr-2" />
                        {warning}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Capacity Impact */}
              <div className="flex items-center justify-between text-sm text-[var(--text-secondary)]">
                <div className="flex items-center gap-4">
                  <span>Current: {rec.capacityImpact.currentUtilization.toFixed(0)}%</span>
                  <span>Projected: {rec.capacityImpact.projectedUtilization.toFixed(0)}%</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>ETC: {rec.capacityImpact.estimatedCompletionTime.toLocaleTimeString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && recommendations.length === 0 && (
        <div className="text-center py-8 text-[var(--text-secondary)]">
          <Brain className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <h4 className="font-medium mb-2">Ready for Smart Assignment</h4>
          <p className="text-sm mb-4">
            Configure the assignment parameters and generate AI-powered recommendations
          </p>
          <div className="flex items-center justify-center gap-6 text-xs">
            <div className="flex items-center gap-1">
              {getComplexityIcon(assignmentRequest.estimatedComplexity || 'moderate')}
              <span className="capitalize">{assignmentRequest.estimatedComplexity}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>{assignmentRequest.estimatedTimeMinutes}m</span>
            </div>
            <div className="flex items-center gap-1">
              <Badge className={getUrgencyColor(assignmentRequest.urgency || 'medium')} variant="outline">
                {assignmentRequest.urgency}
              </Badge>
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}
