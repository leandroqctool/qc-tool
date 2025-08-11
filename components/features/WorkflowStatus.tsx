"use client"

import React from 'react'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { 
  Upload, 
  Search, 
  Edit, 
  Edit2, 
  Edit3, 
  RotateCcw, 
  CheckCircle, 
  XCircle,
  Clock,
  User,
  ChevronRight,
  Play
} from 'lucide-react'

export type WorkflowStage = 'UPLOADED' | 'QC' | 'R1' | 'R2' | 'R3' | 'R4' | 'APPROVED' | 'FAILED'
export type WorkflowAction = 'APPROVE' | 'ADJUST' | 'FAIL' | 'ASSIGN'

interface WorkflowStatusProps {
  fileId: string
  currentStage: WorkflowStage
  revisionCount: number
  assignedTo?: string
  onStageAction?: (action: WorkflowAction) => Promise<void>
  canTakeAction?: boolean
  isAssignedToCurrentUser?: boolean
  className?: string
}

const STAGE_CONFIG = {
  UPLOADED: {
    label: 'Uploaded',
    icon: Upload,
    color: 'bg-gray-100 text-gray-700',
    description: 'File uploaded and ready for QC',
    nextActions: ['ASSIGN'],
  },
  QC: {
    label: 'Quality Control',
    icon: Search,
    color: 'bg-blue-100 text-blue-700',
    description: 'Under quality control review',
    nextActions: ['APPROVE', 'ADJUST', 'FAIL'],
  },
  R1: {
    label: 'Revision 1',
    icon: Edit,
    color: 'bg-yellow-100 text-yellow-700',
    description: 'First revision in progress',
    nextActions: ['APPROVE', 'ADJUST', 'FAIL'],
  },
  R2: {
    label: 'Revision 2',
    icon: Edit2,
    color: 'bg-orange-100 text-orange-700',
    description: 'Second revision in progress',
    nextActions: ['APPROVE', 'ADJUST', 'FAIL'],
  },
  R3: {
    label: 'Revision 3',
    icon: Edit3,
    color: 'bg-red-100 text-red-700',
    description: 'Third revision in progress',
    nextActions: ['APPROVE', 'ADJUST', 'FAIL'],
  },
  R4: {
    label: 'Revision 4',
    icon: RotateCcw,
    color: 'bg-purple-100 text-purple-700',
    description: 'Final revision attempt',
    nextActions: ['APPROVE', 'FAIL'],
  },
  APPROVED: {
    label: 'Approved',
    icon: CheckCircle,
    color: 'bg-green-100 text-green-700',
    description: 'File approved and completed',
    nextActions: [],
  },
  FAILED: {
    label: 'Failed',
    icon: XCircle,
    color: 'bg-red-100 text-red-700',
    description: 'File failed quality control',
    nextActions: [],
  },
} as const

const ACTION_CONFIG = {
  APPROVE: {
    label: 'Approve',
    variant: 'default' as const,
    description: 'Move to next stage or mark as approved',
  },
  ADJUST: {
    label: 'Request Adjustments',
    variant: 'outline' as const,
    description: 'Send back for revisions',
  },
  FAIL: {
    label: 'Fail',
    variant: 'destructive' as const,
    description: 'Mark as failed',
  },
  ASSIGN: {
    label: 'Start QC',
    variant: 'default' as const,
    description: 'Assign to QC team',
  },
} as const

export default function WorkflowStatus({
  fileId,
  currentStage,
  revisionCount,
  assignedTo,
  onStageAction,
  canTakeAction = false,
  isAssignedToCurrentUser = false,
  className = '',
}: WorkflowStatusProps) {
  const config = STAGE_CONFIG[currentStage]
  const Icon = config.icon
  const isCompleted = currentStage === 'APPROVED' || currentStage === 'FAILED'

  // Determine workflow progression
  const stages: WorkflowStage[] = ['UPLOADED', 'QC', 'R1', 'R2', 'R3', 'R4', 'APPROVED']
  const currentIndex = stages.indexOf(currentStage === 'FAILED' ? 'APPROVED' : currentStage)

  return (
    <div className={`bg-[var(--surface)] rounded-lg border border-[var(--border-light)] p-6 ${className}`}>
      {/* Current Status */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${config.color}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-[var(--text-primary)]">{config.label}</h3>
            <p className="text-sm text-[var(--text-secondary)]">{config.description}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {revisionCount > 0 && (
            <Badge variant="outline">
              R{revisionCount}
            </Badge>
          )}
          <Badge variant={isCompleted ? 'success' : 'outline'}>
            {currentStage}
          </Badge>
        </div>
      </div>

      {/* Assignment Info */}
      {assignedTo && (
        <div className="flex items-center gap-2 mb-4 p-3 bg-gray-50 rounded-lg">
          <User className="w-4 h-4 text-gray-500" />
          <span className="text-sm text-[var(--text-secondary)]">
            Assigned to: <span className="font-medium">{assignedTo}</span>
          </span>
          {isAssignedToCurrentUser && (
            <Badge variant="outline" className="ml-auto">
              Your Task
            </Badge>
          )}
        </div>
      )}

      {/* Workflow Timeline */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-[var(--text-primary)] mb-3">Workflow Progress</h4>
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {stages.slice(0, -1).map((stage, index) => {
            const stageConfig = STAGE_CONFIG[stage]
            const StageIcon = stageConfig.icon
            const isPast = index < currentIndex
            const isCurrent = index === currentIndex
            const isFuture = index > currentIndex

            return (
              <React.Fragment key={stage}>
                <div className="flex flex-col items-center gap-1 min-w-0">
                  <div
                    className={`p-2 rounded-full transition-colors ${
                      isPast
                        ? 'bg-green-100 text-green-600'
                        : isCurrent
                        ? stageConfig.color
                        : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    <StageIcon className="w-4 h-4" />
                  </div>
                  <span
                    className={`text-xs font-medium ${
                      isCurrent ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'
                    }`}
                  >
                    {stageConfig.label}
                  </span>
                </div>
                {index < stages.length - 2 && (
                  <ChevronRight
                    className={`w-4 h-4 flex-shrink-0 ${
                      isPast ? 'text-green-400' : 'text-gray-300'
                    }`}
                  />
                )}
              </React.Fragment>
            )
          })}
        </div>
      </div>

      {/* Action Buttons */}
      {canTakeAction && !isCompleted && config.nextActions.length > 0 && (
        <div className="border-t border-[var(--border-light)] pt-4">
          <h4 className="text-sm font-medium text-[var(--text-primary)] mb-3">Available Actions</h4>
          <div className="flex flex-wrap gap-2">
            {config.nextActions.map((action) => {
              const actionConfig = ACTION_CONFIG[action]
              return (
                <Button
                  key={action}
                  variant={actionConfig.variant}
                  size="sm"
                  onClick={() => onStageAction?.(action)}
                  className="flex items-center gap-2"
                >
                  {action === 'ASSIGN' && <Play className="w-3 h-3" />}
                  {action === 'APPROVE' && <CheckCircle className="w-3 h-3" />}
                  {action === 'ADJUST' && <RotateCcw className="w-3 h-3" />}
                  {action === 'FAIL' && <XCircle className="w-3 h-3" />}
                  {actionConfig.label}
                </Button>
              )
            })}
          </div>
          
          <div className="mt-3 p-3 bg-blue-50 rounded-lg">
            <div className="flex items-start gap-2">
              <Clock className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-blue-900">Next Steps</p>
                <ul className="text-xs text-blue-700 mt-1 space-y-1">
                  {config.nextActions.map((action) => (
                    <li key={action}>• {ACTION_CONFIG[action].description}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Completed Status */}
      {isCompleted && (
        <div className="border-t border-[var(--border-light)] pt-4">
          <div className={`p-3 rounded-lg ${config.color}`}>
            <div className="flex items-center gap-2">
              <Icon className="w-4 h-4" />
              <span className="text-sm font-medium">
                {currentStage === 'APPROVED' ? 'File has been approved' : 'File has been marked as failed'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
