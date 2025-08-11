"use client"

import React, { useState } from 'react'
import { Annotation, AnnotationComment } from '../../lib/annotations'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Badge } from '../ui/Badge'
import { 
  MessageSquare, 
  Reply, 
  Check,
  Edit,
  Trash2,
  Clock,
  User
} from 'lucide-react'
import { formatDate } from '../../lib/utils'

interface AnnotationCommentsProps {
  annotations: Annotation[]
  comments: AnnotationComment[]
  selectedAnnotationId?: string
  currentUser: { id: string; name: string }
  onCommentAdd: (annotationId: string, text: string, parentId?: string) => void
  onCommentUpdate: (commentId: string, text: string) => void
  onCommentDelete: (commentId: string) => void
  onAnnotationResolve: (annotationId: string) => void
  onAnnotationSelect: (annotationId: string) => void
  className?: string
}

export default function AnnotationComments({
  annotations,
  comments,
  selectedAnnotationId,
  currentUser,
  onCommentAdd,
  onCommentUpdate,
  onCommentDelete,
  onAnnotationResolve,
  onAnnotationSelect,
  className = '',
}: AnnotationCommentsProps) {
  const [newComment, setNewComment] = useState('')
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [editingComment, setEditingComment] = useState<string | null>(null)
  const [editText, setEditText] = useState('')

  // Group comments by annotation
  const commentsByAnnotation = comments.reduce((acc, comment) => {
    if (!acc[comment.annotationId]) {
      acc[comment.annotationId] = []
    }
    acc[comment.annotationId].push(comment)
    return acc
  }, {} as Record<string, AnnotationComment[]>)

  // Sort annotations by creation date (newest first)
  const sortedAnnotations = [...annotations].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  const handleAddComment = (annotationId: string) => {
    if (!newComment.trim()) return
    onCommentAdd(annotationId, newComment.trim())
    setNewComment('')
  }

  const handleReply = (commentId: string) => {
    if (!replyText.trim()) return
    const comment = comments.find(c => c.id === commentId)
    if (!comment) return
    
    onCommentAdd(comment.annotationId, replyText.trim(), commentId)
    setReplyText('')
    setReplyingTo(null)
  }

  const handleEdit = (commentId: string) => {
    if (!editText.trim()) return
    onCommentUpdate(commentId, editText.trim())
    setEditingComment(null)
    setEditText('')
  }

  const startEdit = (comment: AnnotationComment) => {
    setEditingComment(comment.id)
    setEditText(comment.text)
  }

  const cancelEdit = () => {
    setEditingComment(null)
    setEditText('')
  }

  const getAnnotationTypeIcon = (type: string) => {
    switch (type) {
      case 'text': return '📝'
      case 'arrow': return '➡️'
      case 'rectangle': return '⬛'
      case 'circle': return '⭕'
      case 'highlight': return '🟡'
      case 'measurement': return '📏'
      case 'freehand': return '✏️'
      default: return '📌'
    }
  }

  const getThreadedComments = (annotationId: string): AnnotationComment[] => {
    const annotationComments = commentsByAnnotation[annotationId] || []
    
    // Separate root comments and replies
    const rootComments = annotationComments.filter(c => !c.parentId)
    const replies = annotationComments.filter(c => c.parentId)
    
    // Build threaded structure
    const threaded: AnnotationComment[] = []
    
    rootComments.forEach(root => {
      threaded.push(root)
      // Add replies for this root comment
      replies
        .filter(reply => reply.parentId === root.id)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        .forEach(reply => threaded.push(reply))
    })
    
    return threaded
  }

  return (
    <div className={`h-full flex flex-col bg-[var(--surface)] border-l border-[var(--border-light)] ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-[var(--border-light)]">
        <h3 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          Comments
        </h3>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          {annotations.length} annotations, {comments.length} comments
        </p>
      </div>

      {/* Comments List */}
      <div className="flex-1 overflow-y-auto">
        {sortedAnnotations.length === 0 ? (
          <div className="p-8 text-center">
            <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-[var(--text-secondary)]">No annotations yet</p>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              Select a tool and click on the image to start annotating
            </p>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {sortedAnnotations.map(annotation => {
              const annotationComments = getThreadedComments(annotation.id)
              const isSelected = selectedAnnotationId === annotation.id
              
              return (
                <div 
                  key={annotation.id}
                  className={`border rounded-lg p-4 transition-colors cursor-pointer ${
                    isSelected 
                      ? 'border-[var(--primary)] bg-[var(--primary-light)]' 
                      : 'border-[var(--border-light)] hover:border-[var(--border-medium)]'
                  }`}
                  onClick={() => onAnnotationSelect(annotation.id)}
                >
                  {/* Annotation Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{getAnnotationTypeIcon(annotation.type)}</span>
                      <div>
                        <span className="font-medium text-[var(--text-primary)]">
                          {annotation.type.charAt(0).toUpperCase() + annotation.type.slice(1)} Annotation
                        </span>
                        <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                          <User className="w-3 h-3" />
                          {annotation.userName}
                          <Clock className="w-3 h-3" />
                          {formatDate(annotation.createdAt)}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={annotation.resolved ? 'success' : 'outline'}
                        className="text-xs"
                      >
                        {annotation.resolved ? 'Resolved' : 'Open'}
                      </Badge>
                      
                      {!annotation.resolved && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            onAnnotationResolve(annotation.id)
                          }}
                          className="p-1"
                          title="Mark as resolved"
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Annotation Text (if text annotation) */}
                  {annotation.type === 'text' && (
                    <div className="mb-3 p-2 bg-gray-50 rounded text-sm">
                      &ldquo;{(annotation as { text: string }).text}&rdquo;
                    </div>
                  )}

                  {/* Comments Thread */}
                  <div className="space-y-3">
                    {annotationComments.map(comment => {
                      const isReply = !!comment.parentId
                      const isEditing = editingComment === comment.id
                      const canEdit = comment.userId === currentUser.id
                      
                      return (
                        <div 
                          key={comment.id}
                          className={`${isReply ? 'ml-6 pl-4 border-l-2 border-gray-200' : ''}`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-medium text-[var(--text-primary)]">
                                  {comment.userName}
                                </span>
                                <span className="text-xs text-[var(--text-secondary)]">
                                  {formatDate(comment.createdAt)}
                                </span>
                                {isReply && (
                                  <Badge variant="outline" className="text-xs">
                                    Reply
                                  </Badge>
                                )}
                              </div>
                              
                              {isEditing ? (
                                <div className="space-y-2">
                                  <Input
                                    value={editText}
                                    onChange={(e) => setEditText(e.target.value)}
                                    className="text-sm"
                                    autoFocus
                                  />
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      onClick={() => handleEdit(comment.id)}
                                      disabled={!editText.trim()}
                                    >
                                      Save
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={cancelEdit}
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <p className="text-sm text-[var(--text-primary)]">
                                  {comment.text}
                                </p>
                              )}
                            </div>
                            
                            {!isEditing && canEdit && (
                              <div className="flex items-center gap-1 ml-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => startEdit(comment)}
                                  className="p-1"
                                  title="Edit comment"
                                >
                                  <Edit className="w-3 h-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => onCommentDelete(comment.id)}
                                  className="p-1 text-red-500 hover:text-red-700"
                                  title="Delete comment"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            )}
                          </div>
                          
                          {/* Reply Button */}
                          {!isEditing && !isReply && (
                            <div className="mt-2">
                              {replyingTo === comment.id ? (
                                <div className="space-y-2">
                                  <Input
                                    value={replyText}
                                    onChange={(e) => setReplyText(e.target.value)}
                                    placeholder="Write a reply..."
                                    className="text-sm"
                                    autoFocus
                                  />
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      onClick={() => handleReply(comment.id)}
                                      disabled={!replyText.trim()}
                                    >
                                      Reply
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => setReplyingTo(null)}
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setReplyingTo(comment.id)}
                                  className="text-xs"
                                >
                                  <Reply className="w-3 h-3 mr-1" />
                                  Reply
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {/* Add Comment */}
                  {selectedAnnotationId === annotation.id && (
                    <div className="mt-4 pt-3 border-t border-[var(--border-light)]">
                      <div className="flex gap-2">
                        <Input
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          placeholder="Add a comment..."
                          className="flex-1 text-sm"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault()
                              handleAddComment(annotation.id)
                            }
                          }}
                        />
                        <Button
                          size="sm"
                          onClick={() => handleAddComment(annotation.id)}
                          disabled={!newComment.trim()}
                        >
                          Comment
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
