"use client"

import React from 'react'
import { AnnotationType } from '../../lib/annotations'
import { Button } from '../ui/Button'
import { 
  Type, 
  ArrowRight, 
  Square, 
  Circle, 
  Highlighter, 
  Ruler, 
  Pen,
  MousePointer,
  Undo,
  Redo,
  Download,
  Share,
  MessageSquare
} from 'lucide-react'

interface AnnotationToolbarProps {
  currentTool: AnnotationType | 'select'
  onToolChange: (tool: AnnotationType | 'select') => void
  onUndo?: () => void
  onRedo?: () => void
  onExport?: () => void
  onShare?: () => void
  onToggleComments?: () => void
  canUndo?: boolean
  canRedo?: boolean
  readonly?: boolean
  className?: string
}

const TOOL_CONFIGS = {
  select: {
    icon: MousePointer,
    label: 'Select',
    description: 'Select and move annotations',
    color: 'bg-gray-100 hover:bg-gray-200',
  },
  text: {
    icon: Type,
    label: 'Text',
    description: 'Add text annotations',
    color: 'bg-red-100 hover:bg-red-200 text-red-700',
  },
  arrow: {
    icon: ArrowRight,
    label: 'Arrow',
    description: 'Draw arrows and callouts',
    color: 'bg-teal-100 hover:bg-teal-200 text-teal-700',
  },
  rectangle: {
    icon: Square,
    label: 'Rectangle',
    description: 'Draw rectangles and boxes',
    color: 'bg-blue-100 hover:bg-blue-200 text-blue-700',
  },
  circle: {
    icon: Circle,
    label: 'Circle',
    description: 'Draw circles and ellipses',
    color: 'bg-green-100 hover:bg-green-200 text-green-700',
  },
  highlight: {
    icon: Highlighter,
    label: 'Highlight',
    description: 'Highlight areas',
    color: 'bg-yellow-100 hover:bg-yellow-200 text-yellow-700',
  },
  measurement: {
    icon: Ruler,
    label: 'Measure',
    description: 'Measure distances',
    color: 'bg-purple-100 hover:bg-purple-200 text-purple-700',
  },
  freehand: {
    icon: Pen,
    label: 'Draw',
    description: 'Freehand drawing',
    color: 'bg-pink-100 hover:bg-pink-200 text-pink-700',
  },
} as const

export default function AnnotationToolbar({
  currentTool,
  onToolChange,
  onUndo,
  onRedo,
  onExport,
  onShare,
  onToggleComments,
  canUndo = false,
  canRedo = false,
  readonly = false,
  className = '',
}: AnnotationToolbarProps) {
  const tools = Object.entries(TOOL_CONFIGS) as Array<[keyof typeof TOOL_CONFIGS, typeof TOOL_CONFIGS[keyof typeof TOOL_CONFIGS]]>

  return (
    <div className={`flex items-center gap-2 p-3 bg-[var(--surface)] border-b border-[var(--border-light)] ${className}`}>
      {/* Drawing Tools */}
      {!readonly && (
        <>
          <div className="flex items-center gap-1 pr-3 border-r border-[var(--border-light)]">
            {tools.map(([tool, config]) => {
              const Icon = config.icon
              const isActive = currentTool === tool
              
              return (
                <button
                  key={tool}
                  onClick={() => onToolChange(tool as AnnotationType | 'select')}
                  className={`
                    p-2 rounded-lg transition-colors relative group
                    ${isActive 
                      ? `${config.color} ring-2 ring-[var(--primary)] ring-opacity-50` 
                      : 'hover:bg-gray-100'
                    }
                  `}
                  title={config.description}
                >
                  <Icon className="w-4 h-4" />
                  
                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                    {config.label}
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                  </div>
                </button>
              )
            })}
          </div>

          {/* History Controls */}
          <div className="flex items-center gap-1 pr-3 border-r border-[var(--border-light)]">
            <Button
              variant="ghost"
              size="sm"
              onClick={onUndo}
              disabled={!canUndo}
              className="p-2"
              title="Undo (Ctrl+Z)"
            >
              <Undo className="w-4 h-4" />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={onRedo}
              disabled={!canRedo}
              className="p-2"
              title="Redo (Ctrl+Y)"
            >
              <Redo className="w-4 h-4" />
            </Button>
          </div>
        </>
      )}

      {/* View Controls */}
      <div className="flex items-center gap-1 pr-3 border-r border-[var(--border-light)]">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleComments}
          className="p-2"
          title="Toggle Comments Panel"
        >
          <MessageSquare className="w-4 h-4" />
        </Button>
      </div>

      {/* Export Controls */}
      <div className="flex items-center gap-1 ml-auto">
        <Button
          variant="ghost"
          size="sm"
          onClick={onExport}
          className="p-2"
          title="Export Annotations"
        >
          <Download className="w-4 h-4" />
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={onShare}
          className="p-2"
          title="Share Review"
        >
          <Share className="w-4 h-4" />
        </Button>
      </div>

      {/* Active Tool Indicator */}
      {!readonly && (
        <div className="flex items-center gap-2 ml-4 px-3 py-1 bg-gray-50 rounded-lg">
          <div className="w-2 h-2 bg-[var(--primary)] rounded-full"></div>
          <span className="text-xs font-medium text-gray-700">
            {TOOL_CONFIGS[currentTool as keyof typeof TOOL_CONFIGS]?.label || 'Select'}
          </span>
        </div>
      )}
    </div>
  )
}

// Keyboard shortcuts hook
export function useAnnotationShortcuts(
  onUndo?: () => void,
  onRedo?: () => void,
  onToolChange?: (tool: AnnotationType | 'select') => void
) {
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Prevent shortcuts when typing in inputs
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return
      }

      const { key, ctrlKey, metaKey, shiftKey } = event
      const cmdOrCtrl = ctrlKey || metaKey

      if (cmdOrCtrl) {
        switch (key.toLowerCase()) {
          case 'z':
            event.preventDefault()
            if (shiftKey) {
              onRedo?.()
            } else {
              onUndo?.()
            }
            break
          case 'y':
            event.preventDefault()
            onRedo?.()
            break
        }
      } else {
        // Tool shortcuts
        switch (key.toLowerCase()) {
          case 'v':
            event.preventDefault()
            onToolChange?.('select')
            break
          case 't':
            event.preventDefault()
            onToolChange?.('text')
            break
          case 'a':
            event.preventDefault()
            onToolChange?.('arrow')
            break
          case 'r':
            event.preventDefault()
            onToolChange?.('rectangle')
            break
          case 'c':
            event.preventDefault()
            onToolChange?.('circle')
            break
          case 'h':
            event.preventDefault()
            onToolChange?.('highlight')
            break
          case 'm':
            event.preventDefault()
            onToolChange?.('measurement')
            break
          case 'd':
            event.preventDefault()
            onToolChange?.('freehand')
            break
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onUndo, onRedo, onToolChange])
}
