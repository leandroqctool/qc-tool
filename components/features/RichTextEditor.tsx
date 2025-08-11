'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useToast } from '../ui/ToastProvider'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'
import { Input } from '../ui/Input'
import { Label } from '../ui/Label'
import { Badge } from '../ui/Badge'
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Quote,
  Code,
  CodeSquare,
  Link,
  Image,
  Table,
  Heading1,
  Heading2,
  Heading3,
  Undo,
  Redo,
  Eye,
  Edit3,
  Save,
  Users,
  MessageCircle,
  AtSign,
  Hash,
  Type,
  Palette,
  Maximize2,
  Minimize2,
  Download,
  Upload,
  FileText,
  Copy,
  Check
} from 'lucide-react'

interface EditorUser {
  id: string
  name: string
  avatar?: string
  color: string
  cursor?: {
    line: number
    column: number
  }
  selection?: {
    start: { line: number; column: number }
    end: { line: number; column: number }
  }
  isTyping: boolean
  lastSeen: Date
}

interface EditorComment {
  id: string
  userId: string
  userName: string
  content: string
  position: {
    line: number
    column: number
  }
  resolved: boolean
  createdAt: Date
  replies: EditorComment[]
}

interface EditorVersion {
  id: string
  content: string
  timestamp: Date
  userId: string
  userName: string
  changesSummary: string
}

interface RichTextEditorProps {
  initialContent?: string
  placeholder?: string
  readOnly?: boolean
  showToolbar?: boolean
  showCollaboration?: boolean
  showComments?: boolean
  showVersions?: boolean
  onContentChange?: (content: string, markdown: string) => void
  onSave?: (content: string, markdown: string) => void
  documentId?: string
  userId?: string
  tenantId?: string
  className?: string
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  initialContent = '',
  placeholder = 'Start writing...',
  readOnly = false,
  showToolbar = true,
  showCollaboration = true,
  showComments = true,
  showVersions = true,
  onContentChange,
  onSave,
  documentId = 'doc_1',
  userId = 'user_1',
  tenantId = 'tenant_1',
  className = ''
}) => {
  const { show: toast } = useToast()
  const editorRef = useRef<HTMLDivElement>(null)
  const [content, setContent] = useState(initialContent)
  const [markdown, setMarkdown] = useState('')
  const [isPreviewMode, setIsPreviewMode] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [selectedText, setSelectedText] = useState('')
  
  // Collaboration state
  const [collaborators, setCollaborators] = useState<EditorUser[]>([
    {
      id: 'user_2',
      name: 'Sarah Johnson',
      color: '#3b82f6',
      isTyping: false,
      lastSeen: new Date()
    },
    {
      id: 'user_3',
      name: 'Mike Wilson',
      color: '#10b981',
      isTyping: true,
      lastSeen: new Date()
    }
  ])
  
  // Comments state
  const [comments, setComments] = useState<EditorComment[]>([
    {
      id: 'comment_1',
      userId: 'user_2',
      userName: 'Sarah Johnson',
      content: 'This section needs more detail about the process',
      position: { line: 5, column: 0 },
      resolved: false,
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      replies: []
    }
  ])
  
  // Versions state
  const [versions, setVersions] = useState<EditorVersion[]>([
    {
      id: 'v1',
      content: initialContent,
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
      userId: 'user_1',
      userName: 'Current User',
      changesSummary: 'Initial version'
    }
  ])
  
  // UI state
  const [showLinkDialog, setShowLinkDialog] = useState(false)
  const [showImageDialog, setShowImageDialog] = useState(false)
  const [showCommentsPanel, setShowCommentsPanel] = useState(false)
  const [showVersionsPanel, setShowVersionsPanel] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [linkText, setLinkText] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [imageAlt, setImageAlt] = useState('')
  
  // Auto-save
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)

  // Convert content to markdown
  const convertToMarkdown = useCallback((htmlContent: string): string => {
    let md = htmlContent
    
    // Headers
    md = md.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
    md = md.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
    md = md.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
    
    // Text formatting
    md = md.replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
    md = md.replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
    md = md.replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
    md = md.replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')
    md = md.replace(/<u[^>]*>(.*?)<\/u>/gi, '<u>$1</u>')
    md = md.replace(/<del[^>]*>(.*?)<\/del>/gi, '~~$1~~')
    md = md.replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`')
    
    // Lists
    md = md.replace(/<ul[^>]*>(.*?)<\/ul>/gi, (match, content) => {
      return content.replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n') + '\n'
    })
    md = md.replace(/<ol[^>]*>(.*?)<\/ol>/gi, (match, content) => {
      let counter = 1
      return content.replace(/<li[^>]*>(.*?)<\/li>/gi, () => `${counter++}. $1\n`) + '\n'
    })
    
    // Links and images
    md = md.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
    md = md.replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*\/?>/gi, '![$2]($1)')
    
    // Blockquotes
    md = md.replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gi, (match, content) => {
      return content.replace(/^/gm, '> ') + '\n\n'
    })
    
    // Code blocks
    md = md.replace(/<pre[^>]*><code[^>]*>(.*?)<\/code><\/pre>/gi, '```\n$1\n```\n\n')
    
    // Line breaks and paragraphs
    md = md.replace(/<br\s*\/?>/gi, '\n')
    md = md.replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
    
    // Clean up HTML tags
    md = md.replace(/<[^>]*>/g, '')
    
    // Clean up extra whitespace
    md = md.replace(/\n{3,}/g, '\n\n')
    md = md.trim()
    
    return md
  }, [])

  // Handle content changes
  const handleContentChange = useCallback(() => {
    if (!editorRef.current) return
    
    const newContent = editorRef.current.innerHTML
    const newMarkdown = convertToMarkdown(newContent)
    
    setContent(newContent)
    setMarkdown(newMarkdown)
    setHasUnsavedChanges(true)
    
    onContentChange?.(newContent, newMarkdown)
  }, [convertToMarkdown, onContentChange])

  // Toolbar commands
  const execCommand = useCallback((command: string, value?: string) => {
    if (readOnly) return
    
    document.execCommand(command, false, value)
    handleContentChange()
    editorRef.current?.focus()
  }, [readOnly, handleContentChange])

  const formatText = useCallback((tag: string, value?: string) => {
    if (readOnly) return
    
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return
    
    const range = selection.getRangeAt(0)
    const selectedText = range.toString()
    
    if (selectedText) {
      const element = document.createElement(tag)
      if (value) element.setAttribute('style', value)
      
      try {
        range.deleteContents()
        element.textContent = selectedText
        range.insertNode(element)
        
        // Clear selection
        selection.removeAllRanges()
        handleContentChange()
      } catch (error) {
        console.error('Error formatting text:', error)
      }
    }
    
    editorRef.current?.focus()
  }, [readOnly, handleContentChange])

  // Insert content at cursor
  const insertContent = useCallback((html: string) => {
    if (readOnly) return
    
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return
    
    const range = selection.getRangeAt(0)
    const element = document.createElement('div')
    element.innerHTML = html
    
    range.deleteContents()
    
    // Insert all child nodes
    while (element.firstChild) {
      range.insertNode(element.firstChild)
    }
    
    handleContentChange()
    editorRef.current?.focus()
  }, [readOnly, handleContentChange])

  // Handle link insertion
  const handleInsertLink = useCallback(() => {
    if (!linkUrl || !linkText) {
      toast('Please enter both URL and text', 'error')
      return
    }
    
    insertContent(`<a href="${linkUrl}" target="_blank" rel="noopener noreferrer">${linkText}</a>`)
    
    setLinkUrl('')
    setLinkText('')
    setShowLinkDialog(false)
    toast('Link inserted successfully', 'success')
  }, [linkUrl, linkText, insertContent, toast])

  // Handle image insertion
  const handleInsertImage = useCallback(() => {
    if (!imageUrl) {
      toast('Please enter image URL', 'error')
      return
    }
    
    insertContent(`<img src="${imageUrl}" alt="${imageAlt}" style="max-width: 100%; height: auto;" />`)
    
    setImageUrl('')
    setImageAlt('')
    setShowImageDialog(false)
    toast('Image inserted successfully', 'success')
  }, [imageUrl, imageAlt, insertContent, toast])

  // Save functionality
  const handleSave = useCallback(async () => {
    try {
      await onSave?.(content, markdown)
      setHasUnsavedChanges(false)
      setLastSaved(new Date())
      
      // Create new version
      const newVersion: EditorVersion = {
        id: `v${versions.length + 1}`,
        content,
        timestamp: new Date(),
        userId,
        userName: 'Current User',
        changesSummary: `Updated content (${content.length} characters)`
      }
      setVersions(prev => [...prev, newVersion])
      
      toast('Document saved successfully', 'success')
    } catch (error) {
      toast('Failed to save document', 'error')
    }
  }, [content, markdown, onSave, versions.length, userId, toast])

  // Auto-save
  useEffect(() => {
    if (!hasUnsavedChanges) return
    
    const autoSaveTimer = setTimeout(() => {
      handleSave()
    }, 5000) // Auto-save after 5 seconds of inactivity
    
    return () => clearTimeout(autoSaveTimer)
  }, [hasUnsavedChanges, handleSave])

  // Handle selection changes
  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection()
      if (selection && selection.toString()) {
        setSelectedText(selection.toString())
      } else {
        setSelectedText('')
      }
    }
    
    document.addEventListener('selectionchange', handleSelectionChange)
    return () => document.removeEventListener('selectionchange', handleSelectionChange)
  }, [])

  // Add comment to selected text
  const addComment = useCallback(() => {
    if (!selectedText) {
      toast('Please select text to comment on', 'info')
      return
    }
    
    const newComment: EditorComment = {
      id: `comment_${Date.now()}`,
      userId,
      userName: 'Current User',
      content: 'New comment on selected text',
      position: { line: 1, column: 0 }, // Would calculate actual position
      resolved: false,
      createdAt: new Date(),
      replies: []
    }
    
    setComments(prev => [...prev, newComment])
    setShowCommentsPanel(true)
    toast('Comment added', 'success')
  }, [selectedText, userId, toast])

  // Export functionality
  const exportAsMarkdown = useCallback(() => {
    const blob = new Blob([markdown], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `document-${documentId}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    toast('Markdown exported successfully', 'success')
  }, [markdown, documentId, toast])

  const exportAsHTML = useCallback(() => {
    const htmlContent = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Document</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        h1, h2, h3 { color: #333; }
        code { background: #f5f5f5; padding: 2px 4px; border-radius: 3px; }
        pre { background: #f5f5f5; padding: 16px; border-radius: 6px; overflow-x: auto; }
        blockquote { border-left: 4px solid #ddd; margin: 0; padding-left: 16px; color: #666; }
    </style>
</head>
<body>
    ${content}
</body>
</html>`
    
    const blob = new Blob([htmlContent], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `document-${documentId}.html`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    toast('HTML exported successfully', 'success')
  }, [content, documentId, toast])

  const copyToClipboard = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(markdown)
      toast('Content copied to clipboard', 'success')
    } catch (error) {
      toast('Failed to copy content', 'error')
    }
  }, [markdown, toast])

  return (
    <div className={`rich-text-editor ${isFullscreen ? 'fixed inset-0 z-50 bg-white' : ''} ${className}`}>
      {/* Toolbar */}
      {showToolbar && (
        <div className="border-b border-gray-200 p-2">
          <div className="flex items-center gap-1 flex-wrap">
            {/* Text Formatting */}
            <div className="flex items-center gap-1 border-r border-gray-200 pr-2 mr-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => execCommand('bold')}
                disabled={readOnly}
                title="Bold (Ctrl+B)"
              >
                <Bold className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => execCommand('italic')}
                disabled={readOnly}
                title="Italic (Ctrl+I)"
              >
                <Italic className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => execCommand('underline')}
                disabled={readOnly}
                title="Underline (Ctrl+U)"
              >
                <Underline className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => execCommand('strikeThrough')}
                disabled={readOnly}
                title="Strikethrough"
              >
                <Strikethrough className="w-4 h-4" />
              </Button>
            </div>

            {/* Headers */}
            <div className="flex items-center gap-1 border-r border-gray-200 pr-2 mr-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => execCommand('formatBlock', 'h1')}
                disabled={readOnly}
                title="Heading 1"
              >
                <Heading1 className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => execCommand('formatBlock', 'h2')}
                disabled={readOnly}
                title="Heading 2"
              >
                <Heading2 className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => execCommand('formatBlock', 'h3')}
                disabled={readOnly}
                title="Heading 3"
              >
                <Heading3 className="w-4 h-4" />
              </Button>
            </div>

            {/* Alignment */}
            <div className="flex items-center gap-1 border-r border-gray-200 pr-2 mr-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => execCommand('justifyLeft')}
                disabled={readOnly}
                title="Align Left"
              >
                <AlignLeft className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => execCommand('justifyCenter')}
                disabled={readOnly}
                title="Align Center"
              >
                <AlignCenter className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => execCommand('justifyRight')}
                disabled={readOnly}
                title="Align Right"
              >
                <AlignRight className="w-4 h-4" />
              </Button>
            </div>

            {/* Lists */}
            <div className="flex items-center gap-1 border-r border-gray-200 pr-2 mr-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => execCommand('insertUnorderedList')}
                disabled={readOnly}
                title="Bullet List"
              >
                <List className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => execCommand('insertOrderedList')}
                disabled={readOnly}
                title="Numbered List"
              >
                <ListOrdered className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => execCommand('formatBlock', 'blockquote')}
                disabled={readOnly}
                title="Quote"
              >
                <Quote className="w-4 h-4" />
              </Button>
            </div>

            {/* Insert */}
            <div className="flex items-center gap-1 border-r border-gray-200 pr-2 mr-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowLinkDialog(true)}
                disabled={readOnly}
                title="Insert Link"
              >
                <Link className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowImageDialog(true)}
                disabled={readOnly}
                title="Insert Image"
              >
                <Image className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => insertContent('<table border="1"><tr><td>Cell 1</td><td>Cell 2</td></tr><tr><td>Cell 3</td><td>Cell 4</td></tr></table>')}
                disabled={readOnly}
                title="Insert Table"
              >
                <Table className="w-4 h-4" />
              </Button>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 border-r border-gray-200 pr-2 mr-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => execCommand('undo')}
                disabled={readOnly}
                title="Undo (Ctrl+Z)"
              >
                <Undo className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => execCommand('redo')}
                disabled={readOnly}
                title="Redo (Ctrl+Y)"
              >
                <Redo className="w-4 h-4" />
              </Button>
            </div>

            {/* View */}
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsPreviewMode(!isPreviewMode)}
                title={isPreviewMode ? 'Edit Mode' : 'Preview Mode'}
              >
                {isPreviewMode ? <Edit3 className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsFullscreen(!isFullscreen)}
                title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          {/* Second Row - Collaboration & Actions */}
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
            <div className="flex items-center gap-2">
              {/* Collaboration */}
              {showCollaboration && (
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    {collaborators.map((user) => (
                      <div
                        key={user.id}
                        className="w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-xs text-white font-medium"
                        style={{ backgroundColor: user.color }}
                        title={`${user.name}${user.isTyping ? ' (typing...)' : ''}`}
                      >
                        {user.name.charAt(0)}
                      </div>
                    ))}
                  </div>
                  {collaborators.some(u => u.isTyping) && (
                    <Badge variant="outline" className="text-xs">
                      Someone is typing...
                    </Badge>
                  )}
                </div>
              )}

              {/* Comments */}
              {showComments && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowCommentsPanel(!showCommentsPanel)}
                  className="flex items-center gap-1"
                >
                  <MessageCircle className="w-4 h-4" />
                  {comments.length}
                </Button>
              )}

              {/* Add Comment */}
              {selectedText && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={addComment}
                  className="flex items-center gap-1"
                  title="Add comment to selection"
                >
                  <AtSign className="w-4 h-4" />
                  Comment
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Status */}
              <div className="flex items-center gap-2 text-sm text-gray-500">
                {hasUnsavedChanges && <Badge variant="outline">Unsaved</Badge>}
                {lastSaved && (
                  <span>Saved {lastSaved.toLocaleTimeString()}</span>
                )}
                <span>{content.replace(/<[^>]*>/g, '').length} characters</span>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={copyToClipboard}
                  title="Copy to clipboard"
                >
                  <Copy className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={exportAsMarkdown}
                  title="Export as Markdown"
                >
                  <Download className="w-4 h-4" />
                </Button>
                {showVersions && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowVersionsPanel(!showVersionsPanel)}
                    title="Version History"
                  >
                    <FileText className="w-4 h-4" />
                  </Button>
                )}
                {!readOnly && (
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={!hasUnsavedChanges}
                    className="flex items-center gap-1"
                  >
                    <Save className="w-4 h-4" />
                    Save
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Editor Area */}
      <div className="flex flex-1 min-h-0">
        {/* Editor */}
        <div className="flex-1 flex flex-col">
          {isPreviewMode ? (
            <div 
              className="flex-1 p-4 prose prose-gray max-w-none overflow-y-auto"
              dangerouslySetInnerHTML={{ __html: content }}
            />
          ) : (
            <div
              ref={editorRef}
              contentEditable={!readOnly}
              suppressContentEditableWarning
              className={`flex-1 p-4 outline-none overflow-y-auto ${
                readOnly ? 'bg-gray-50' : 'bg-white'
              } prose prose-gray max-w-none`}
              style={{ minHeight: '300px' }}
              onInput={handleContentChange}
              onPaste={handleContentChange}
              data-placeholder={placeholder}
              dangerouslySetInnerHTML={{ __html: content }}
            />
          )}
        </div>

        {/* Comments Panel */}
        {showCommentsPanel && showComments && (
          <div className="w-80 border-l border-gray-200 bg-gray-50 flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-medium text-gray-900">Comments</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {comments.map((comment) => (
                <div key={comment.id} className="bg-white rounded-lg p-3 shadow-sm">
                  <div className="flex items-start justify-between mb-2">
                    <div className="font-medium text-sm text-gray-900">
                      {comment.userName}
                    </div>
                    <div className="text-xs text-gray-500">
                      {comment.createdAt.toLocaleTimeString()}
                    </div>
                  </div>
                  <div className="text-sm text-gray-700 mb-2">
                    {comment.content}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" className="text-xs">
                      Reply
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs"
                      onClick={() => {
                        setComments(prev =>
                          prev.map(c =>
                            c.id === comment.id ? { ...c, resolved: !c.resolved } : c
                          )
                        )
                      }}
                    >
                      {comment.resolved ? 'Reopen' : 'Resolve'}
                    </Button>
                  </div>
                  {comment.resolved && (
                    <Badge variant="outline" className="mt-2 text-xs">
                      Resolved
                    </Badge>
                  )}
                </div>
              ))}
              {comments.length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  No comments yet
                </div>
              )}
            </div>
          </div>
        )}

        {/* Versions Panel */}
        {showVersionsPanel && showVersions && (
          <div className="w-80 border-l border-gray-200 bg-gray-50 flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-medium text-gray-900">Version History</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {versions.map((version) => (
                <div key={version.id} className="bg-white rounded-lg p-3 shadow-sm">
                  <div className="flex items-start justify-between mb-2">
                    <div className="font-medium text-sm text-gray-900">
                      {version.userName}
                    </div>
                    <div className="text-xs text-gray-500">
                      {version.timestamp.toLocaleString()}
                    </div>
                  </div>
                  <div className="text-sm text-gray-700 mb-2">
                    {version.changesSummary}
                  </div>
                  <Button size="sm" variant="outline" className="text-xs">
                    Restore
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Link Dialog */}
      <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
        <div className="max-w-md">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Insert Link</h2>
          <div className="space-y-4">
            <div>
              <Label htmlFor="link-text">Link Text</Label>
              <Input
                id="link-text"
                placeholder="Enter link text"
                value={linkText}
                onChange={(e) => setLinkText(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="link-url">URL</Label>
              <Input
                id="link-url"
                placeholder="https://example.com"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" onClick={() => setShowLinkDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleInsertLink}>
              Insert Link
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Image Dialog */}
      <Dialog open={showImageDialog} onOpenChange={setShowImageDialog}>
        <div className="max-w-md">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Insert Image</h2>
          <div className="space-y-4">
            <div>
              <Label htmlFor="image-url">Image URL</Label>
              <Input
                id="image-url"
                placeholder="https://example.com/image.jpg"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="image-alt">Alt Text (optional)</Label>
              <Input
                id="image-alt"
                placeholder="Description of the image"
                value={imageAlt}
                onChange={(e) => setImageAlt(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" onClick={() => setShowImageDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleInsertImage}>
              Insert Image
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  )
}

export default RichTextEditor
