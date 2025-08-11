// File security validation utilities
export interface FileValidationConfig {
  maxFileSize: number // bytes
  allowedMimeTypes: string[]
  allowedExtensions: string[]
  maxFilesPerUpload: number
}

export interface FileValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

// Default configuration - can be overridden per use case
export const DEFAULT_FILE_CONFIG: FileValidationConfig = {
  maxFileSize: 100 * 1024 * 1024, // 100MB
  allowedMimeTypes: [
    // Images
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'image/bmp',
    'image/tiff',
    // Videos
    'video/mp4',
    'video/mpeg',
    'video/quicktime',
    'video/x-msvideo', // .avi
    'video/x-ms-wmv', // .wmv
    'video/webm',
    // Documents
    'application/pdf',
    'application/msword', // .doc
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'application/vnd.ms-excel', // .xls
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-powerpoint', // .ppt
    'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
    // Text files
    'text/plain',
    'text/csv',
    'application/json',
    'application/xml',
    'text/xml',
    // Archives
    'application/zip',
    'application/x-rar-compressed',
    'application/x-7z-compressed',
    'application/gzip',
    'application/x-tar',
  ],
  allowedExtensions: [
    '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.tiff',
    '.mp4', '.mpeg', '.mov', '.avi', '.wmv', '.webm',
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
    '.txt', '.csv', '.json', '.xml',
    '.zip', '.rar', '.7z', '.gz', '.tar',
  ],
  maxFilesPerUpload: 10,
}

// Magic number signatures for file type detection
const FILE_SIGNATURES = new Map<string, Uint8Array[]>([
  // Images
  ['image/jpeg', [
    new Uint8Array([0xFF, 0xD8, 0xFF]),
  ]],
  ['image/png', [
    new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
  ]],
  ['image/gif', [
    new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x37, 0x61]), // GIF87a
    new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]), // GIF89a
  ]],
  ['image/webp', [
    new Uint8Array([0x52, 0x49, 0x46, 0x46]), // RIFF header (need to check WEBP at offset 8)
  ]],
  ['image/bmp', [
    new Uint8Array([0x42, 0x4D]),
  ]],
  // Documents
  ['application/pdf', [
    new Uint8Array([0x25, 0x50, 0x44, 0x46]), // %PDF
  ]],
  // Archives
  ['application/zip', [
    new Uint8Array([0x50, 0x4B, 0x03, 0x04]), // PK..
    new Uint8Array([0x50, 0x4B, 0x05, 0x06]), // PK.. (empty archive)
    new Uint8Array([0x50, 0x4B, 0x07, 0x08]), // PK.. (spanned archive)
  ]],
  // Video
  ['video/mp4', [
    new Uint8Array([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70]), // ftyp
    new Uint8Array([0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70]), // ftyp
  ]],
])

/**
 * Validates file based on name, size, and MIME type
 */
export function validateFileBasic(
  file: File,
  config: FileValidationConfig = DEFAULT_FILE_CONFIG
): FileValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Check file size
  if (file.size > config.maxFileSize) {
    errors.push(`File size ${formatFileSize(file.size)} exceeds maximum allowed size of ${formatFileSize(config.maxFileSize)}`)
  }

  // Check MIME type
  if (!config.allowedMimeTypes.includes(file.type)) {
    errors.push(`File type "${file.type}" is not allowed`)
  }

  // Check file extension
  const extension = getFileExtension(file.name).toLowerCase()
  if (!config.allowedExtensions.includes(extension)) {
    errors.push(`File extension "${extension}" is not allowed`)
  }

  // Check for suspicious file names
  if (hasSuspiciousFileName(file.name)) {
    warnings.push('File name contains potentially suspicious characters')
  }

  // Check for empty files
  if (file.size === 0) {
    errors.push('Empty files are not allowed')
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Advanced validation using magic numbers (requires file buffer)
 */
export async function validateFileMagicNumber(
  file: File,
  config: FileValidationConfig = DEFAULT_FILE_CONFIG
): Promise<FileValidationResult> {
  const basicValidation = validateFileBasic(file, config)
  if (!basicValidation.isValid) {
    return basicValidation
  }

  const errors = [...basicValidation.errors]
  const warnings = [...basicValidation.warnings]

  try {
    // Read first 32 bytes for magic number detection
    const buffer = await file.slice(0, 32).arrayBuffer()
    const bytes = new Uint8Array(buffer)

    // Get expected signatures for the declared MIME type
    const expectedSignatures = FILE_SIGNATURES.get(file.type)
    if (expectedSignatures) {
      const matchesSignature = expectedSignatures.some(signature => 
        matchesBytes(bytes, signature)
      )

      if (!matchesSignature) {
        // Special case for WEBP - need to check WEBP signature at offset 8
        if (file.type === 'image/webp') {
          const webpSignature = new Uint8Array([0x57, 0x45, 0x42, 0x50]) // WEBP
          if (bytes.length >= 12 && matchesBytes(bytes.slice(8), webpSignature)) {
            // Valid WEBP
          } else {
            errors.push('File content does not match declared WEBP format')
          }
        } else {
          errors.push(`File content does not match declared MIME type "${file.type}"`)
        }
      }
    } else {
      warnings.push(`Magic number validation not available for MIME type "${file.type}"`)
    }
  } catch {
    warnings.push('Could not read file content for magic number validation')
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Validates multiple files for batch upload
 */
export function validateFilesBatch(
  files: File[],
  config: FileValidationConfig = DEFAULT_FILE_CONFIG
): { isValid: boolean; results: FileValidationResult[]; globalErrors: string[] } {
  const globalErrors: string[] = []
  
  // Check total number of files
  if (files.length > config.maxFilesPerUpload) {
    globalErrors.push(`Too many files. Maximum ${config.maxFilesPerUpload} files allowed per upload`)
  }

  // Check total size
  const totalSize = files.reduce((sum, file) => sum + file.size, 0)
  const maxTotalSize = config.maxFileSize * files.length // Allow max size per file
  if (totalSize > maxTotalSize) {
    globalErrors.push(`Total upload size ${formatFileSize(totalSize)} exceeds limit`)
  }

  // Validate each file
  const results = files.map(file => validateFileBasic(file, config))
  
  // Check for duplicate names
  const fileNames = files.map(f => f.name.toLowerCase())
  const duplicates = fileNames.filter((name, index) => fileNames.indexOf(name) !== index)
  if (duplicates.length > 0) {
    globalErrors.push(`Duplicate file names detected: ${[...new Set(duplicates)].join(', ')}`)
  }

  const allValid = globalErrors.length === 0 && results.every(r => r.isValid)

  return {
    isValid: allValid,
    results,
    globalErrors,
  }
}

// Helper functions

function getFileExtension(fileName: string): string {
  const lastDot = fileName.lastIndexOf('.')
  return lastDot === -1 ? '' : fileName.substring(lastDot)
}

function hasSuspiciousFileName(fileName: string): boolean {
  const suspiciousPatterns = [
    /\.(exe|bat|cmd|scr|pif|com|vbs|js|jar|app)$/i, // Executable extensions
    /[<>:"|?*]/, // Invalid filename characters
    /^\.|\.\./, // Hidden or parent directory references
    /\s+$/, // Trailing whitespace
  ]
  
  return suspiciousPatterns.some(pattern => pattern.test(fileName))
}

function matchesBytes(buffer: Uint8Array, signature: Uint8Array): boolean {
  if (buffer.length < signature.length) return false
  
  for (let i = 0; i < signature.length; i++) {
    if (buffer[i] !== signature[i]) return false
  }
  
  return true
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// Specialized validation configs for different use cases
export const IMAGE_ONLY_CONFIG: FileValidationConfig = {
  ...DEFAULT_FILE_CONFIG,
  maxFileSize: 10 * 1024 * 1024, // 10MB for images
  allowedMimeTypes: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
  ],
  allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'],
}

export const DOCUMENT_ONLY_CONFIG: FileValidationConfig = {
  ...DEFAULT_FILE_CONFIG,
  maxFileSize: 50 * 1024 * 1024, // 50MB for documents
  allowedMimeTypes: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv',
  ],
  allowedExtensions: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.txt', '.csv'],
}
