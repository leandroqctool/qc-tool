"use client"

import React, { useState, useCallback } from 'react'
import { 
  Annotation, 
  AnnotationComment, 
  AnnotationType,
  generateAnnotationId
} from '../../lib/annotations'
import AnnotationCanvas from './AnnotationCanvas'
import AnnotationToolbar, { useAnnotationShortcuts } from './AnnotationToolbar'
import AnnotationComments from './AnnotationComments'
import { useToast } from '../ui/ToastProvider'

interface AnnotationViewerProps {
  fileId: string
  fileUrl: string
  fileName: string
  initialAnnotations?: Annotation[]
  initialComments?: AnnotationComment[]
  currentUser: { id: string; name: string }
  readonly?: boolean
  onSave?: (annotations: Annotation[], comments: AnnotationComment[]) => Promise<void>
  className?: string
}

export default function AnnotationViewer({
  fileId,
  fileUrl,
  fileName,
  initialAnnotations = [],
  initialComments = [],
  currentUser,
  readonly = false,
  onSave,
  className = '',
}: AnnotationViewerProps) {
  const [annotations, setAnnotations] = useState<Annotation[]>(initialAnnotations)
  const [comments, setComments] = useState<AnnotationComment[]>(initialComments)
  const [currentTool, setCurrentTool] = useState<AnnotationType | 'select'>('select')
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null)
  const [showComments, setShowComments] = useState(true)
  const [history, setHistory] = useState<{ annotations: Annotation[]; comments: AnnotationComment[] }[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  
  const { show } = useToast()

  // Save current state to history
  const saveToHistory = useCallback(() => {
    const newState = { annotations: [...annotations], comments: [...comments] }
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push(newState)
    
    // Limit history to 50 states
    if (newHistory.length > 50) {
      newHistory.shift()
    } else {
      setHistoryIndex(historyIndex + 1)
    }
    
    setHistory(newHistory)
  }, [annotations, comments, history, historyIndex])

  // Handle annotation creation
  const handleAnnotationCreate = useCallback((newAnnotation: Omit<Annotation, 'id' | 'createdAt' | 'updatedAt'>) => {
    saveToHistory()
    
    const annotation = {
      ...newAnnotation,
      id: generateAnnotationId(),
      fileId,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Annotation
    
    setAnnotations(prev => [...prev, annotation])
    setSelectedAnnotationId(annotation.id)
    setHasUnsavedChanges(true)
    
    show('Annotation created', 'success')
  }, [fileId, saveToHistory, show])

  // Handle annotation update
  const handleAnnotationUpdate = useCallback((id: string, updates: Partial<Annotation>) => {
    saveToHistory()
    
    setAnnotations(prev => prev.map(annotation => 
      annotation.id === id 
        ? { ...annotation, ...updates, updatedAt: new Date() } as Annotation
        : annotation
    ))
    setHasUnsavedChanges(true)
  }, [saveToHistory])

  // Handle annotation deletion
  const handleAnnotationDelete = useCallback((id: string) => {
    saveToHistory()
    
    setAnnotations(prev => prev.filter(annotation => annotation.id !== id))
    setComments(prev => prev.filter(comment => comment.annotationId !== id))
    
    if (selectedAnnotationId === id) {
      setSelectedAnnotationId(null)
    }
    
    setHasUnsavedChanges(true)
    show('Annotation deleted', 'success')
  }, [selectedAnnotationId, saveToHistory, show])

  // Handle comment creation
  const handleCommentAdd = useCallback((annotationId: string, text: string, parentId?: string) => {
    saveToHistory()
    
    const comment: AnnotationComment = {
      id: generateAnnotationId(),
      annotationId,
      userId: currentUser.id,
      userName: currentUser.name,
      text,
      createdAt: new Date(),
      parentId,
    }
    
    setComments(prev => [...prev, comment])
    setHasUnsavedChanges(true)
    
    show('Comment added', 'success')
  }, [currentUser, saveToHistory, show])

  // Handle comment update
  const handleCommentUpdate = useCallback((commentId: string, text: string) => {
    saveToHistory()
    
    setComments(prev => prev.map(comment =>
      comment.id === commentId
        ? { ...comment, text }
        : comment
    ))
    setHasUnsavedChanges(true)
  }, [saveToHistory])

  // Handle comment deletion
  const handleCommentDelete = useCallback((commentId: string) => {
    saveToHistory()
    
    setComments(prev => prev.filter(comment => comment.id !== commentId))
    setHasUnsavedChanges(true)
    
    show('Comment deleted', 'success')
  }, [saveToHistory, show])

  // Handle annotation resolve
  const handleAnnotationResolve = useCallback((annotationId: string) => {
    handleAnnotationUpdate(annotationId, { resolved: true })
    show('Annotation resolved', 'success')
  }, [handleAnnotationUpdate, show])

  // Handle undo
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const previousState = history[historyIndex - 1]
      setAnnotations(previousState.annotations)
      setComments(previousState.comments)
      setHistoryIndex(historyIndex - 1)
      setHasUnsavedChanges(true)
    }
  }, [history, historyIndex])

  // Handle redo
  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1]
      setAnnotations(nextState.annotations)
      setComments(nextState.comments)
      setHistoryIndex(historyIndex + 1)
      setHasUnsavedChanges(true)
    }
  }, [history, historyIndex])

  // Handle export
  const handleExport = useCallback(() => {
    const exportData = {
      fileName,
      fileId,
      annotations,
      comments,
      exportedAt: new Date().toISOString(),
      exportedBy: currentUser.name,
    }
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${fileName}_annotations.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    show('Annotations exported', 'success')
  }, [fileName, fileId, annotations, comments, currentUser.name, show])

  // Handle share
  const handleShare = useCallback(async () => {
    try {
      const shareUrl = `${window.location.origin}/files/${fileId}`
      await navigator.clipboard.writeText(shareUrl)
      show('Share link copied to clipboard', 'success')
    } catch {
      show('Failed to copy share link', 'error')
    }
  }, [fileId, show])

  // Handle save
  const handleSave = useCallback(async () => {
    if (!onSave) return
    
    try {
      await onSave(annotations, comments)
      setHasUnsavedChanges(false)
      show('Annotations saved', 'success')
    } catch {
      show('Failed to save annotations', 'error')
    }
  }, [annotations, comments, onSave, show])

  // Auto-save when changes are made
  React.useEffect(() => {
    if (hasUnsavedChanges && onSave) {
      const timeoutId = setTimeout(() => {
        handleSave()
      }, 2000) // Auto-save after 2 seconds of inactivity
      
      return () => clearTimeout(timeoutId)
    }
  }, [hasUnsavedChanges, handleSave, onSave])

  // Keyboard shortcuts
  useAnnotationShortcuts(handleUndo, handleRedo, setCurrentTool)

  const canUndo = historyIndex > 0
  const canRedo = historyIndex < history.length - 1

  return (
    <div className={`h-full flex flex-col bg-[var(--background)] ${className}`}>
      {/* Toolbar */}
      <AnnotationToolbar
        currentTool={currentTool}
        onToolChange={setCurrentTool}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onExport={handleExport}
        onShare={handleShare}
        onToggleComments={() => setShowComments(!showComments)}
        canUndo={canUndo}
        canRedo={canRedo}
        readonly={readonly}
      />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Canvas Area */}
        <div className="flex-1 relative">
          <AnnotationCanvas
            imageUrl={fileUrl}
            annotations={annotations}
            onAnnotationCreate={handleAnnotationCreate}
            onAnnotationUpdate={handleAnnotationUpdate}
            onAnnotationDelete={handleAnnotationDelete}
            currentTool={currentTool === 'select' ? 'text' : currentTool} // Default to text for now
            currentUser={currentUser}
            readonly={readonly}
            className="w-full h-full"
          />
          
          {/* Unsaved Changes Indicator */}
          {hasUnsavedChanges && (
            <div className="absolute top-4 right-4 px-3 py-1 bg-yellow-100 border border-yellow-300 rounded-lg text-sm text-yellow-800">
              Unsaved changes
            </div>
          )}
        </div>

        {/* Comments Panel */}
        {showComments && (
          <div className="w-80 flex-shrink-0">
            <AnnotationComments
              annotations={annotations}
              comments={comments}
              selectedAnnotationId={selectedAnnotationId || undefined}
              currentUser={currentUser}
              onCommentAdd={handleCommentAdd}
              onCommentUpdate={handleCommentUpdate}
              onCommentDelete={handleCommentDelete}
              onAnnotationResolve={handleAnnotationResolve}
              onAnnotationSelect={setSelectedAnnotationId}
              className="h-full"
            />
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className="px-4 py-2 bg-[var(--surface)] border-t border-[var(--border-light)] text-xs text-[var(--text-secondary)] flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span>{annotations.length} annotations</span>
          <span>{comments.length} comments</span>
          <span>{annotations.filter(a => !a.resolved).length} unresolved</span>
        </div>
        
        <div className="flex items-center gap-4">
          {hasUnsavedChanges && <span className="text-yellow-600">● Unsaved changes</span>}
          <span>Tool: {currentTool}</span>
          <span>User: {currentUser.name}</span>
        </div>
      </div>
    </div>
  )
}
