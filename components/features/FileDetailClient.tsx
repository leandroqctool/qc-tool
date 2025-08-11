"use client"

import { useState } from 'react'
import WorkflowStatus, { type WorkflowAction } from './WorkflowStatus'
import AnnotationViewer from './AnnotationViewer'
import RealtimeMessaging from './RealtimeMessaging'
import AIQualityDashboard from './AIQualityDashboard'
import { useToast } from '../ui/ToastProvider'
import { MessageSquare, Brain } from 'lucide-react'
import { Button } from '../ui/Button'

interface FileDetailClientProps {
  fileId: string
  fileUrl: string
  fileName: string
  currentStage: string
  revisionCount: number
  assignedTo?: string
  currentUser: { id: string; name: string }
  isImageFile: boolean
}

export default function FileDetailClient({
  fileId,
  fileUrl,
  fileName,
  currentStage,
  revisionCount,
  assignedTo,
  currentUser,
  isImageFile,
}: FileDetailClientProps) {
  const { show } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [stage, setStage] = useState(currentStage)
  const [showChat, setShowChat] = useState(false)
  const [chatMinimized, setChatMinimized] = useState(false)
  const [showAI, setShowAI] = useState(false)

  // Mock annotations and comments for now
  const mockAnnotations: never[] = []
  const mockComments: never[] = []

  const handleSaveAnnotations = async (annotations: unknown[], comments: unknown[]) => {
    try {
      const response = await fetch(`/api/files/${fileId}/annotations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ annotations, comments })
      })

      if (!response.ok) {
        throw new Error('Failed to save annotations')
      }

      show('Annotations saved successfully', 'success')
    } catch (error) {
      console.error('Error saving annotations:', error)
      show('Failed to save annotations', 'error')
    }
  }

  const handleWorkflowAction = async (action: WorkflowAction) => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/workflow/${fileId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action,
          comments: '' // TODO: Add comment dialog
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Workflow action failed')
      }

      show(data.message, 'success')
      
      if (data.newStage) {
        setStage(data.newStage)
      }

      // Refresh page after successful action
      setTimeout(() => {
        window.location.reload()
      }, 1500)
    } catch (error) {
      console.error('Workflow action error:', error)
      show(error instanceof Error ? error.message : 'Workflow action failed', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex-1 overflow-hidden flex relative">
      {/* Left Side - File Viewer/Annotations */}
      <div className="flex-1 overflow-hidden">
        {isImageFile ? (
          <AnnotationViewer
            fileId={fileId}
            fileUrl={fileUrl}
            fileName={fileName}
            initialAnnotations={mockAnnotations}
            initialComments={mockComments}
            currentUser={currentUser}
            onSave={handleSaveAnnotations}
            className="h-full"
          />
        ) : (
          <div className="h-full flex items-center justify-center bg-gray-50">
            <div className="text-center max-w-md">
              <div className="w-16 h-16 bg-gray-300 rounded-lg mx-auto mb-4 flex items-center justify-center">
                📄
              </div>
              <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">
                Preview not available
              </h3>
              <p className="text-[var(--text-secondary)] mb-6">
                This file type doesn&apos;t support visual annotation. You can still download and review the file.
              </p>
              <div className="flex gap-3 justify-center">
                <button className="px-4 py-2 border border-[var(--border-light)] rounded-lg hover:bg-gray-50 transition-colors">
                  Download File
                </button>
                <button className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary)]/90 transition-colors">
                  Add Comments
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Right Side - Workflow Status & AI */}
      <div className="w-80 flex-shrink-0 border-l border-[var(--border-light)] bg-[var(--background)] overflow-y-auto">
        <div className="p-4">
          <WorkflowStatus
            fileId={fileId}
            currentStage={stage as 'UPLOADED' | 'QC' | 'R1' | 'R2' | 'R3' | 'R4' | 'APPROVED' | 'FAILED'}
            revisionCount={revisionCount}
            assignedTo={assignedTo ? `User ${assignedTo.slice(-8)}` : undefined}
            canTakeAction={!isLoading}
            isAssignedToCurrentUser={assignedTo === currentUser.id}
            onStageAction={handleWorkflowAction}
          />
        </div>

        {/* Action Buttons */}
        <div className="p-4 border-t border-[var(--border-light)] space-y-2">
          <Button 
            variant="outline" 
            onClick={() => setShowAI(!showAI)}
            className="w-full justify-start"
          >
            <Brain className="w-4 h-4 mr-2" />
            {showAI ? 'Hide AI Analysis' : 'Show AI Analysis'}
          </Button>
          
          <Button 
            variant="outline" 
            onClick={() => setShowChat(!showChat)}
            className="w-full justify-start"
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            {showChat ? 'Hide Discussion' : 'Show Discussion'}
          </Button>
        </div>

        {/* AI Analysis Panel */}
        {showAI && (
          <div className="p-4 border-t border-[var(--border-light)]">
            <AIQualityDashboard
              fileId={fileId}
              fileName={fileName}
              autoAnalyze={false}
            />
          </div>
        )}
      </div>

      {/* Floating Chat */}
      {showChat && (
        <div className="fixed bottom-4 right-4 z-50">
          <RealtimeMessaging
            channelId={`file_${fileId}`}
            channelName={`File: ${fileName}`}
            channelType="file"
            fileId={fileId}
            className={chatMinimized ? 'w-80' : 'w-96 h-96'}
            minimized={chatMinimized}
            onMinimize={() => setChatMinimized(true)}
            onMaximize={() => setChatMinimized(false)}
          />
        </div>
      )}
    </div>
  )
}
