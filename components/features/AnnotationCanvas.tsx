"use client"

import React, { useRef, useEffect, useState, useCallback } from 'react'
import { 
  Annotation, 
  AnnotationType, 
  Point, 
  DEFAULT_ANNOTATION_STYLES,
  generateAnnotationId,
  screenToRelative,
  relativeToScreen,
  getAnnotationBounds,
  calculateDistance
} from '../../lib/annotations'

interface AnnotationCanvasProps {
  imageUrl: string
  annotations: Annotation[]
  onAnnotationCreate: (annotation: Omit<Annotation, 'id' | 'createdAt' | 'updatedAt'>) => void
  onAnnotationUpdate: (id: string, updates: Partial<Annotation>) => void
  onAnnotationDelete: (id: string) => void
  currentTool: AnnotationType
  currentUser: { id: string; name: string }
  readonly?: boolean
  className?: string
}

export default function AnnotationCanvas({
  imageUrl,
  annotations,
  onAnnotationCreate,
  onAnnotationUpdate,
  onAnnotationDelete,
  currentTool,
  currentUser,
  readonly = false,
  className = '',
}: AnnotationCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentPath, setCurrentPath] = useState<Point[]>([])
  const [selectedAnnotation, setSelectedAnnotation] = useState<string | null>(null)
  const [dragStart, setDragStart] = useState<Point | null>(null)
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 })
  const [imageLoaded, setImageLoaded] = useState(false)

  // Initialize canvas and load image
  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    const image = imageRef.current
    
    if (!canvas || !container || !image) return

    const updateCanvasSize = () => {
      const containerRect = container.getBoundingClientRect()
      canvas.width = containerRect.width
      canvas.height = containerRect.height
      setCanvasSize({ width: canvas.width, height: canvas.height })
    }

    // Load image
    image.onload = () => {
      setImageLoaded(true)
      updateCanvasSize()
    }
    
    if (image.complete) {
      setImageLoaded(true)
      updateCanvasSize()
    }

    window.addEventListener('resize', updateCanvasSize)
    return () => window.removeEventListener('resize', updateCanvasSize)
  }, [imageUrl])

  // Redraw canvas when annotations change
  useEffect(() => {
    if (!imageLoaded) return
    redrawCanvas()
  }, [annotations, selectedAnnotation, currentPath, imageLoaded, canvasSize])

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current
    const image = imageRef.current
    if (!canvas || !image || !imageLoaded) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Draw image (scaled to fit)
    const imageAspectRatio = image.naturalWidth / image.naturalHeight
    const canvasAspectRatio = canvas.width / canvas.height
    
    let drawWidth, drawHeight, offsetX, offsetY
    
    if (imageAspectRatio > canvasAspectRatio) {
      // Image is wider - fit to width
      drawWidth = canvas.width
      drawHeight = canvas.width / imageAspectRatio
      offsetX = 0
      offsetY = (canvas.height - drawHeight) / 2
    } else {
      // Image is taller - fit to height
      drawHeight = canvas.height
      drawWidth = canvas.height * imageAspectRatio
      offsetX = (canvas.width - drawWidth) / 2
      offsetY = 0
    }

    ctx.drawImage(image, offsetX, offsetY, drawWidth, drawHeight)

    // Draw annotations
    annotations.forEach(annotation => {
      drawAnnotation(ctx, annotation, { offsetX, offsetY, drawWidth, drawHeight })
    })

    // Draw current path for active drawing
    if (currentPath.length > 0) {
      drawCurrentPath(ctx, { offsetX, offsetY, drawWidth, drawHeight })
    }
  }, [annotations, selectedAnnotation, currentPath, imageLoaded, canvasSize])

  const drawAnnotation = (
    ctx: CanvasRenderingContext2D, 
    annotation: Annotation,
    imageTransform: { offsetX: number; offsetY: number; drawWidth: number; drawHeight: number }
  ) => {
    const { offsetX, offsetY, drawWidth, drawHeight } = imageTransform
    const isSelected = selectedAnnotation === annotation.id

    // Set style
    ctx.strokeStyle = annotation.color
    ctx.fillStyle = annotation.color
    ctx.lineWidth = annotation.strokeWidth + (isSelected ? 2 : 0)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    // Convert relative coordinates to screen coordinates
    const toScreen = (point: Point) => ({
      x: offsetX + point.x * drawWidth,
      y: offsetY + point.y * drawHeight,
    })

    switch (annotation.type) {
      case 'text':
        const textPos = toScreen(annotation.position)
        ctx.font = `${annotation.fontSize}px ${annotation.fontFamily}`
        ctx.fillText(annotation.text, textPos.x, textPos.y)
        break

      case 'arrow':
        const arrowStart = toScreen(annotation.start)
        const arrowEnd = toScreen(annotation.end)
        drawArrow(ctx, arrowStart, arrowEnd)
        break

      case 'rectangle':
        const rectPos = toScreen(annotation.position)
        const rectWidth = annotation.width * drawWidth
        const rectHeight = annotation.height * drawHeight
        
        if (annotation.filled) {
          ctx.fillRect(rectPos.x, rectPos.y, rectWidth, rectHeight)
        } else {
          ctx.strokeRect(rectPos.x, rectPos.y, rectWidth, rectHeight)
        }
        break

      case 'circle':
        const circleCenter = toScreen(annotation.center)
        const circleRadius = annotation.radius * Math.min(drawWidth, drawHeight)
        
        ctx.beginPath()
        ctx.arc(circleCenter.x, circleCenter.y, circleRadius, 0, 2 * Math.PI)
        
        if (annotation.filled) {
          ctx.fill()
        } else {
          ctx.stroke()
        }
        break

      case 'highlight':
        ctx.save()
        ctx.globalAlpha = annotation.opacity
        ctx.beginPath()
        annotation.points.forEach((point, index) => {
          const screenPoint = toScreen(point)
          if (index === 0) {
            ctx.moveTo(screenPoint.x, screenPoint.y)
          } else {
            ctx.lineTo(screenPoint.x, screenPoint.y)
          }
        })
        ctx.closePath()
        ctx.fill()
        ctx.restore()
        break

      case 'measurement':
        const measureStart = toScreen(annotation.start)
        const measureEnd = toScreen(annotation.end)
        
        // Draw measurement line
        ctx.beginPath()
        ctx.moveTo(measureStart.x, measureStart.y)
        ctx.lineTo(measureEnd.x, measureEnd.y)
        ctx.stroke()
        
        // Draw measurement text
        const midPoint = {
          x: (measureStart.x + measureEnd.x) / 2,
          y: (measureStart.y + measureEnd.y) / 2,
        }
        ctx.fillText(`${annotation.value.toFixed(2)} ${annotation.unit}`, midPoint.x, midPoint.y - 10)
        break

      case 'freehand':
        if (annotation.points.length > 1) {
          ctx.beginPath()
          annotation.points.forEach((point, index) => {
            const screenPoint = toScreen(point)
            if (index === 0) {
              ctx.moveTo(screenPoint.x, screenPoint.y)
            } else {
              ctx.lineTo(screenPoint.x, screenPoint.y)
            }
          })
          ctx.stroke()
        }
        break
    }

    // Draw selection indicator
    if (isSelected) {
      const bounds = getAnnotationBounds(annotation)
      const screenBounds = {
        x: offsetX + bounds.x * drawWidth,
        y: offsetY + bounds.y * drawHeight,
        width: bounds.width * drawWidth,
        height: bounds.height * drawHeight,
      }
      
      ctx.save()
      ctx.strokeStyle = '#0D99FF'
      ctx.lineWidth = 2
      ctx.setLineDash([5, 5])
      ctx.strokeRect(screenBounds.x - 5, screenBounds.y - 5, screenBounds.width + 10, screenBounds.height + 10)
      ctx.restore()
    }
  }

  const drawArrow = (ctx: CanvasRenderingContext2D, start: Point, end: Point) => {
    const angle = Math.atan2(end.y - start.y, end.x - start.x)
    const arrowLength = 10
    const arrowAngle = Math.PI / 6

    // Draw line
    ctx.beginPath()
    ctx.moveTo(start.x, start.y)
    ctx.lineTo(end.x, end.y)
    ctx.stroke()

    // Draw arrowhead
    ctx.beginPath()
    ctx.moveTo(end.x, end.y)
    ctx.lineTo(
      end.x - arrowLength * Math.cos(angle - arrowAngle),
      end.y - arrowLength * Math.sin(angle - arrowAngle)
    )
    ctx.moveTo(end.x, end.y)
    ctx.lineTo(
      end.x - arrowLength * Math.cos(angle + arrowAngle),
      end.y - arrowLength * Math.sin(angle + arrowAngle)
    )
    ctx.stroke()
  }

  const drawCurrentPath = (
    ctx: CanvasRenderingContext2D,
    imageTransform: { offsetX: number; offsetY: number; drawWidth: number; drawHeight: number }
  ) => {
    if (currentPath.length < 2) return

    const { offsetX, offsetY, drawWidth, drawHeight } = imageTransform
    const style = DEFAULT_ANNOTATION_STYLES[currentTool]
    
    ctx.strokeStyle = style.color
    ctx.lineWidth = style.strokeWidth
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    const toScreen = (point: Point) => ({
      x: offsetX + point.x * drawWidth,
      y: offsetY + point.y * drawHeight,
    })

    if (currentTool === 'freehand') {
      ctx.beginPath()
      currentPath.forEach((point, index) => {
        const screenPoint = toScreen(point)
        if (index === 0) {
          ctx.moveTo(screenPoint.x, screenPoint.y)
        } else {
          ctx.lineTo(screenPoint.x, screenPoint.y)
        }
      })
      ctx.stroke()
    } else if (currentTool === 'arrow' && currentPath.length === 2) {
      const start = toScreen(currentPath[0])
      const end = toScreen(currentPath[1])
      drawArrow(ctx, start, end)
    } else if (currentTool === 'rectangle' && currentPath.length === 2) {
      const start = toScreen(currentPath[0])
      const end = toScreen(currentPath[1])
      const width = end.x - start.x
      const height = end.y - start.y
      ctx.strokeRect(start.x, start.y, width, height)
    }
  }

  const getMousePosition = (event: React.MouseEvent): Point => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }

    const rect = canvas.getBoundingClientRect()
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    }
  }

  const screenToRelativeCoords = (screenPoint: Point): Point => {
    const image = imageRef.current
    const canvas = canvasRef.current
    if (!image || !canvas) return screenPoint

    const imageAspectRatio = image.naturalWidth / image.naturalHeight
    const canvasAspectRatio = canvas.width / canvas.height
    
    let drawWidth, drawHeight, offsetX, offsetY
    
    if (imageAspectRatio > canvasAspectRatio) {
      drawWidth = canvas.width
      drawHeight = canvas.width / imageAspectRatio
      offsetX = 0
      offsetY = (canvas.height - drawHeight) / 2
    } else {
      drawHeight = canvas.height
      drawWidth = canvas.height * imageAspectRatio
      offsetX = (canvas.width - drawWidth) / 2
      offsetY = 0
    }

    return {
      x: (screenPoint.x - offsetX) / drawWidth,
      y: (screenPoint.y - offsetY) / drawHeight,
    }
  }

  const handleMouseDown = (event: React.MouseEvent) => {
    if (readonly) return

    const mousePos = getMousePosition(event)
    const relativePos = screenToRelativeCoords(mousePos)

    // Check if clicking on existing annotation
    const clickedAnnotation = findAnnotationAtPoint(relativePos)
    if (clickedAnnotation) {
      setSelectedAnnotation(clickedAnnotation.id)
      return
    }

    setSelectedAnnotation(null)
    setIsDrawing(true)
    setDragStart(relativePos)
    setCurrentPath([relativePos])
  }

  const handleMouseMove = (event: React.MouseEvent) => {
    if (readonly || !isDrawing) return

    const mousePos = getMousePosition(event)
    const relativePos = screenToRelativeCoords(mousePos)

    if (currentTool === 'freehand') {
      setCurrentPath(prev => [...prev, relativePos])
    } else {
      setCurrentPath([dragStart!, relativePos])
    }
  }

  const handleMouseUp = () => {
    if (readonly || !isDrawing || !dragStart) return

    setIsDrawing(false)

    if (currentPath.length < 2) {
      setCurrentPath([])
      return
    }

    // Create annotation based on current tool
    const style = DEFAULT_ANNOTATION_STYLES[currentTool]
    const baseAnnotation = {
      type: currentTool,
      fileId: '', // Will be set by parent component
      userId: currentUser.id,
      userName: currentUser.name,
      color: style.color,
      strokeWidth: style.strokeWidth,
      resolved: false,
    }

    let annotation: Omit<Annotation, 'id' | 'createdAt' | 'updatedAt'>

    switch (currentTool) {
      case 'text':
        // Text tool requires additional input - would show dialog in real implementation
        annotation = {
          ...baseAnnotation,
          position: currentPath[0],
          text: 'New text annotation',
          fontSize: (style as { fontSize?: number }).fontSize || 14,
          fontFamily: (style as { fontFamily?: string }).fontFamily || 'Arial, sans-serif',
        } as Omit<Annotation, 'id' | 'createdAt' | 'updatedAt'>
        break

      case 'arrow':
        annotation = {
          ...baseAnnotation,
          start: currentPath[0],
          end: currentPath[1],
        } as Omit<Annotation, 'id' | 'createdAt' | 'updatedAt'>
        break

      case 'rectangle':
        const rectStart = currentPath[0]
        const rectEnd = currentPath[1]
        annotation = {
          ...baseAnnotation,
          position: rectStart,
          width: Math.abs(rectEnd.x - rectStart.x),
          height: Math.abs(rectEnd.y - rectStart.y),
          filled: false,
        } as Omit<Annotation, 'id' | 'createdAt' | 'updatedAt'>
        break

      case 'circle':
        const circleStart = currentPath[0]
        const circleEnd = currentPath[1]
        const radius = calculateDistance(circleStart, circleEnd)
        annotation = {
          ...baseAnnotation,
          center: circleStart,
          radius: radius / Math.min(canvasSize.width, canvasSize.height), // Normalize radius
          filled: false,
        } as Omit<Annotation, 'id' | 'createdAt' | 'updatedAt'>
        break

      case 'highlight':
        annotation = {
          ...baseAnnotation,
          points: currentPath,
          opacity: (style as { opacity?: number }).opacity || 0.3,
        } as Omit<Annotation, 'id' | 'createdAt' | 'updatedAt'>
        break

      case 'measurement':
        const distance = calculateDistance(currentPath[0], currentPath[1])
        annotation = {
          ...baseAnnotation,
          start: currentPath[0],
          end: currentPath[1],
          unit: 'px' as const,
          value: distance * Math.min(canvasSize.width, canvasSize.height), // Convert to pixels
        } as Omit<Annotation, 'id' | 'createdAt' | 'updatedAt'>
        break

      case 'freehand':
        annotation = {
          ...baseAnnotation,
          points: currentPath,
        } as Omit<Annotation, 'id' | 'createdAt' | 'updatedAt'>
        break

      default:
        setCurrentPath([])
        return
    }

    onAnnotationCreate(annotation)
    setCurrentPath([])
  }

  const findAnnotationAtPoint = (point: Point): Annotation | null => {
    // Find annotation that contains the point (in reverse order for top-most)
    for (let i = annotations.length - 1; i >= 0; i--) {
      const annotation = annotations[i]
      const bounds = getAnnotationBounds(annotation)
      
      if (
        point.x >= bounds.x &&
        point.x <= bounds.x + bounds.width &&
        point.y >= bounds.y &&
        point.y <= bounds.y + bounds.height
      ) {
        return annotation
      }
    }
    return null
  }

  return (
    <div 
      ref={containerRef} 
      className={`relative w-full h-full bg-gray-100 ${className}`}
      style={{ minHeight: '400px' }}
    >
      <img
        ref={imageRef}
        src={imageUrl}
        alt="Annotation target"
        className="hidden"
        crossOrigin="anonymous"
      />
      
      <canvas
        ref={canvasRef}
        className="absolute inset-0 cursor-crosshair"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          if (isDrawing) {
            handleMouseUp()
          }
        }}
      />
      
      {!imageLoaded && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-sm text-gray-500">Loading image...</p>
          </div>
        </div>
      )}
    </div>
  )
}
