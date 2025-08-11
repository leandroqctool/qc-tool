// Visual annotation system for images and PDFs
export type AnnotationType = 
  | 'text' 
  | 'arrow' 
  | 'rectangle' 
  | 'circle' 
  | 'highlight' 
  | 'measurement'
  | 'freehand'

export interface Point {
  x: number
  y: number
}

export interface BaseAnnotation {
  id: string
  type: AnnotationType
  fileId: string
  userId: string
  userName: string
  createdAt: Date
  updatedAt: Date
  page?: number // For PDFs
  resolved?: boolean
  color: string
  strokeWidth: number
}

export interface TextAnnotation extends BaseAnnotation {
  type: 'text'
  position: Point
  text: string
  fontSize: number
  fontFamily: string
}

export interface ArrowAnnotation extends BaseAnnotation {
  type: 'arrow'
  start: Point
  end: Point
  text?: string
}

export interface RectangleAnnotation extends BaseAnnotation {
  type: 'rectangle'
  position: Point
  width: number
  height: number
  filled: boolean
  text?: string
}

export interface CircleAnnotation extends BaseAnnotation {
  type: 'circle'
  center: Point
  radius: number
  filled: boolean
  text?: string
}

export interface HighlightAnnotation extends BaseAnnotation {
  type: 'highlight'
  points: Point[]
  opacity: number
}

export interface MeasurementAnnotation extends BaseAnnotation {
  type: 'measurement'
  start: Point
  end: Point
  unit: 'px' | 'mm' | 'cm' | 'in'
  value: number
  scale?: number // pixels per unit
}

export interface FreehandAnnotation extends BaseAnnotation {
  type: 'freehand'
  points: Point[]
}

export type Annotation = 
  | TextAnnotation 
  | ArrowAnnotation 
  | RectangleAnnotation 
  | CircleAnnotation 
  | HighlightAnnotation 
  | MeasurementAnnotation
  | FreehandAnnotation

export interface AnnotationComment {
  id: string
  annotationId: string
  userId: string
  userName: string
  text: string
  createdAt: Date
  parentId?: string // For threaded comments
}

// Default annotation styles
export const DEFAULT_ANNOTATION_STYLES = {
  text: {
    color: '#FF6B6B',
    fontSize: 14,
    fontFamily: 'Arial, sans-serif',
    strokeWidth: 1,
  },
  arrow: {
    color: '#4ECDC4',
    strokeWidth: 2,
  },
  rectangle: {
    color: '#45B7D1',
    strokeWidth: 2,
    filled: false,
  },
  circle: {
    color: '#96CEB4',
    strokeWidth: 2,
    filled: false,
  },
  highlight: {
    color: '#FFEAA7',
    opacity: 0.3,
    strokeWidth: 0,
  },
  measurement: {
    color: '#6C5CE7',
    strokeWidth: 2,
  },
  freehand: {
    color: '#FD79A8',
    strokeWidth: 2,
  },
} as const

// Annotation validation
export function validateAnnotation(annotation: Partial<Annotation>): string[] {
  const errors: string[] = []

  if (!annotation.type) {
    errors.push('Annotation type is required')
  }

  if (!annotation.fileId) {
    errors.push('File ID is required')
  }

  if (!annotation.userId) {
    errors.push('User ID is required')
  }

  if (!annotation.color) {
    errors.push('Color is required')
  }

  // Type-specific validation
  switch (annotation.type) {
    case 'text':
      const textAnnotation = annotation as Partial<TextAnnotation>
      if (!textAnnotation.text) {
        errors.push('Text content is required')
      }
      if (!textAnnotation.position) {
        errors.push('Position is required for text annotation')
      }
      break

    case 'arrow':
      const arrowAnnotation = annotation as Partial<ArrowAnnotation>
      if (!arrowAnnotation.start || !arrowAnnotation.end) {
        errors.push('Start and end points are required for arrow annotation')
      }
      break

    case 'rectangle':
      const rectAnnotation = annotation as Partial<RectangleAnnotation>
      if (!rectAnnotation.position || typeof rectAnnotation.width !== 'number' || typeof rectAnnotation.height !== 'number') {
        errors.push('Position, width, and height are required for rectangle annotation')
      }
      break

    case 'circle':
      const circleAnnotation = annotation as Partial<CircleAnnotation>
      if (!circleAnnotation.center || typeof circleAnnotation.radius !== 'number') {
        errors.push('Center and radius are required for circle annotation')
      }
      break

    case 'highlight':
      const highlightAnnotation = annotation as Partial<HighlightAnnotation>
      if (!highlightAnnotation.points || highlightAnnotation.points.length < 2) {
        errors.push('At least 2 points are required for highlight annotation')
      }
      break

    case 'measurement':
      const measurementAnnotation = annotation as Partial<MeasurementAnnotation>
      if (!measurementAnnotation.start || !measurementAnnotation.end) {
        errors.push('Start and end points are required for measurement annotation')
      }
      if (!measurementAnnotation.unit) {
        errors.push('Unit is required for measurement annotation')
      }
      break

    case 'freehand':
      const freehandAnnotation = annotation as Partial<FreehandAnnotation>
      if (!freehandAnnotation.points || freehandAnnotation.points.length < 2) {
        errors.push('At least 2 points are required for freehand annotation')
      }
      break
  }

  return errors
}

// Utility functions
export function calculateDistance(point1: Point, point2: Point): number {
  return Math.sqrt(Math.pow(point2.x - point1.x, 2) + Math.pow(point2.y - point1.y, 2))
}

export function calculateAngle(start: Point, end: Point): number {
  return Math.atan2(end.y - start.y, end.x - start.x)
}

export function isPointInRectangle(point: Point, rect: { position: Point; width: number; height: number }): boolean {
  return (
    point.x >= rect.position.x &&
    point.x <= rect.position.x + rect.width &&
    point.y >= rect.position.y &&
    point.y <= rect.position.y + rect.height
  )
}

export function isPointInCircle(point: Point, circle: { center: Point; radius: number }): boolean {
  const distance = calculateDistance(point, circle.center)
  return distance <= circle.radius
}

// Convert screen coordinates to relative coordinates (0-1)
export function screenToRelative(screenPoint: Point, containerSize: { width: number; height: number }): Point {
  return {
    x: screenPoint.x / containerSize.width,
    y: screenPoint.y / containerSize.height,
  }
}

// Convert relative coordinates to screen coordinates
export function relativeToScreen(relativePoint: Point, containerSize: { width: number; height: number }): Point {
  return {
    x: relativePoint.x * containerSize.width,
    y: relativePoint.y * containerSize.height,
  }
}

// Generate annotation ID
export function generateAnnotationId(): string {
  return `annotation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// Export annotation data for storage
export function serializeAnnotation(annotation: Annotation): string {
  return JSON.stringify(annotation)
}

// Import annotation data from storage
export function deserializeAnnotation(data: string): Annotation {
  const parsed = JSON.parse(data)
  
  // Convert date strings back to Date objects
  if (parsed.createdAt) {
    parsed.createdAt = new Date(parsed.createdAt)
  }
  if (parsed.updatedAt) {
    parsed.updatedAt = new Date(parsed.updatedAt)
  }
  
  return parsed as Annotation
}

// Get annotation bounds for collision detection and selection
export function getAnnotationBounds(annotation: Annotation): { x: number; y: number; width: number; height: number } {
  switch (annotation.type) {
    case 'text':
      // Approximate text bounds - would need actual text metrics in real implementation
      const textWidth = annotation.text.length * (annotation.fontSize * 0.6)
      return {
        x: annotation.position.x,
        y: annotation.position.y - annotation.fontSize,
        width: textWidth,
        height: annotation.fontSize * 1.2,
      }

    case 'arrow':
      const minX = Math.min(annotation.start.x, annotation.end.x)
      const minY = Math.min(annotation.start.y, annotation.end.y)
      const maxX = Math.max(annotation.start.x, annotation.end.x)
      const maxY = Math.max(annotation.start.y, annotation.end.y)
      return {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY,
      }

    case 'rectangle':
      return {
        x: annotation.position.x,
        y: annotation.position.y,
        width: annotation.width,
        height: annotation.height,
      }

    case 'circle':
      return {
        x: annotation.center.x - annotation.radius,
        y: annotation.center.y - annotation.radius,
        width: annotation.radius * 2,
        height: annotation.radius * 2,
      }

    case 'highlight':
    case 'freehand':
      const xs = annotation.points.map(p => p.x)
      const ys = annotation.points.map(p => p.y)
      const minXPoint = Math.min(...xs)
      const minYPoint = Math.min(...ys)
      const maxXPoint = Math.max(...xs)
      const maxYPoint = Math.max(...ys)
      return {
        x: minXPoint,
        y: minYPoint,
        width: maxXPoint - minXPoint,
        height: maxYPoint - minYPoint,
      }

    case 'measurement':
      const measureMinX = Math.min(annotation.start.x, annotation.end.x)
      const measureMinY = Math.min(annotation.start.y, annotation.end.y)
      const measureMaxX = Math.max(annotation.start.x, annotation.end.x)
      const measureMaxY = Math.max(annotation.start.y, annotation.end.y)
      return {
        x: measureMinX,
        y: measureMinY,
        width: measureMaxX - measureMinX,
        height: measureMaxY - measureMinY,
      }

    default:
      return { x: 0, y: 0, width: 0, height: 0 }
  }
}
