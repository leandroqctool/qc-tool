"use client"

import { useCallback, useRef, useState } from 'react'
import { useToast } from '../ui/ToastProvider'
import CopyButton from '../ui/CopyButton'
import { validateFilesBatch, validateFileMagicNumber, DEFAULT_FILE_CONFIG, type FileValidationConfig } from '../../lib/fileValidation'
import { LoadingSpinner } from '../ui/LoadingSpinner'

type UploadResult = {
  id: string
  originalName: string
  url: string
  mimeType?: string
}

interface FileUploadProps {
  projectId?: string
  validationConfig?: FileValidationConfig
  maxFiles?: number
}

export default function FileUpload({ projectId, validationConfig = DEFAULT_FILE_CONFIG, maxFiles }: FileUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [isValidating, setIsValidating] = useState(false)
  const [progressByFile, setProgressByFile] = useState<Record<string, number>>({})
  const [errorsByFile, setErrorsByFile] = useState<Record<string, string>>({})
  const [warningsByFile, setWarningsByFile] = useState<Record<string, string[]>>({})
  const [uploaded, setUploaded] = useState<UploadResult[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const { show } = useToast()
  const xhrByNameRef = useRef<Record<string, XMLHttpRequest | undefined>>({})

  const handleFiles = useCallback(async (fileList: FileList | File[]) => {
    const files = Array.from(fileList)
    if (files.length === 0) return

    setIsValidating(true)
    setErrorsByFile({})
    setWarningsByFile({})

    // Apply file limit if specified
    const limitedFiles = maxFiles ? files.slice(0, maxFiles) : files
    if (maxFiles && files.length > maxFiles) {
      show(`Only the first ${maxFiles} files will be processed`, 'info')
    }

    // Comprehensive validation
    const batchValidation = validateFilesBatch(limitedFiles, validationConfig)
    
    // Handle global validation errors
    if (batchValidation.globalErrors.length > 0) {
      batchValidation.globalErrors.forEach(error => show(error, 'error'))
      setIsValidating(false)
      return
    }

    // Process individual file validation results
    const validFiles: File[] = []
    for (let i = 0; i < limitedFiles.length; i++) {
      const file = limitedFiles[i]
      const result = batchValidation.results[i]
      
      if (!result.isValid) {
        setErrorsByFile(prev => ({ ...prev, [file.name]: result.errors.join('; ') }))
        continue
      }
      
      if (result.warnings.length > 0) {
        setWarningsByFile(prev => ({ ...prev, [file.name]: result.warnings }))
      }
      
      // Advanced validation with magic numbers
      try {
        const advancedResult = await validateFileMagicNumber(file, validationConfig)
        if (!advancedResult.isValid) {
          setErrorsByFile(prev => ({ ...prev, [file.name]: advancedResult.errors.join('; ') }))
          continue
        }
        if (advancedResult.warnings.length > 0) {
          setWarningsByFile(prev => ({ 
            ...prev, 
            [file.name]: [...(prev[file.name] || []), ...advancedResult.warnings] 
          }))
        }
      } catch (error) {
        console.warn('Advanced validation failed for', file.name, error)
        // Continue with basic validation passed
      }
      
      validFiles.push(file)
    }

    setIsValidating(false)
    
    if (validFiles.length === 0) {
      show('No valid files to upload', 'error')
      return
    }

    setIsUploading(true)

    let hadErrors = false
    const uploads = validFiles.map(async (file) => {
      try {
        setProgressByFile((prev) => ({ ...prev, [file.name]: 0 }))

        const presignRes = await fetch('/api/files/upload-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: file.name, contentType: file.type, size: file.size, projectId }),
        })

        if (!presignRes.ok) {
          const err = await presignRes.json().catch(() => ({ error: 'Failed to get upload URL' }))
          const msg = err.error || 'Failed to get upload URL'
          throw new Error(msg)
        }

        const { uploadUrl, fileRecord } = (await presignRes.json()) as {
          uploadUrl: string
          fileRecord: UploadResult
        }

        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest()
          xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
              const pct = Math.round((e.loaded * 100) / e.total)
              setProgressByFile((prev) => ({ ...prev, [file.name]: pct }))
            }
          })
          xhr.addEventListener('load', async () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                await fetch('/api/files/confirm', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    key: fileRecord.id,
                    originalName: file.name,
                    contentType: file.type,
                    size: file.size,
                    projectId,
                  }),
                })
              } catch {}
              delete xhrByNameRef.current[file.name]
              resolve()
            } else {
              delete xhrByNameRef.current[file.name]
              reject(new Error('Upload failed'))
            }
          })
          xhr.addEventListener('error', () => { delete xhrByNameRef.current[file.name]; reject(new Error('Upload failed')) })
          xhr.addEventListener('abort', () => { delete xhrByNameRef.current[file.name]; reject(new Error('Upload cancelled')) })
          xhr.open('PUT', uploadUrl)
          xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream')
          xhrByNameRef.current[file.name] = xhr
          xhr.send(file)
        })

        setUploaded((prev) => [...prev, { ...fileRecord, mimeType: file.type }])
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Upload failed'
        setErrorsByFile((prev) => ({ ...prev, [file.name]: message }))
        hadErrors = true
      }
    })

    await Promise.all(uploads)
    setIsUploading(false)
    if (validFiles.length > 0 && !hadErrors) {
      show('Upload complete', 'success')
    } else if (hadErrors) {
      show('Some files failed to upload', 'error')
    }
  }, [projectId, show])

  const onSelectFiles = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files) return
    await handleFiles(event.target.files)
    // reset input so selecting same file again triggers change
    if (inputRef.current) inputRef.current.value = ''
  }, [handleFiles, maxFiles, validationConfig])

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-white shadow-sm p-6" id="upload">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Upload files</h3>
            <p className="text-sm text-gray-600">Direct-to-R2 uploads using presigned URLs</p>
          </div>
          <label className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0D99FF] text-white ${isUploading || isValidating ? 'opacity-60 cursor-not-allowed' : 'hover:bg-[#0B87E5] cursor-pointer'}`}>
            <input ref={inputRef} type="file" multiple accept="*/*" className="hidden" onChange={onSelectFiles} disabled={isUploading || isValidating} />
            {isValidating && <LoadingSpinner size="sm" />}
            {isValidating ? 'Validating...' : isUploading ? 'Uploading...' : 'Choose files'}
          </label>
        </div>
        <div
          className={`mt-4 border-2 border-dashed rounded-xl p-6 text-sm text-gray-600 ${isDragOver ? 'border-[#0D99FF] bg-blue-50/50' : 'border-gray-200'}`}
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={async (e) => {
            e.preventDefault()
            setIsDragOver(false)
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
              await handleFiles(e.dataTransfer.files)
            }
          }}
        >
          Drag & drop files here, or use the button above
        </div>
        <div className="mt-3 text-xs text-gray-500">
          Having CORS issues? Try the alternate endpoint upload:
          <form
            className="mt-2 flex items-center gap-2"
            onSubmit={async (e) => {
              e.preventDefault()
              const input = (e.currentTarget.elements.namedItem('direct') as HTMLInputElement) ?? null
              if (!input || !input.files?.length) return
              const file = input.files[0]
               const fd = new FormData()
              fd.append('file', file)
               if (projectId) fd.append('projectId', projectId)
              setIsUploading(true)
              try {
                const res = await fetch('/api/files/direct-upload', { method: 'POST', body: fd })
                if (res.ok) {
                  const data = await res.json()
                  setUploaded((prev) => [...prev, data.fileRecord])
                } else {
                  setErrorsByFile((prev) => ({ ...prev, [file.name]: 'Direct upload failed' }))
                }
              } finally {
                setIsUploading(false)
              }
            }}
          >
            <input name="direct" type="file" className="text-xs" />
             <button disabled={isUploading} className={`px-3 py-1 rounded text-white text-xs ${isUploading ? 'bg-[#0D99FF]/50 cursor-not-allowed' : 'bg-[#0D99FF]'}`}>Upload (alt)</button>
          </form>
        </div>

        {isUploading && (
          <div className="mt-4 space-y-2">
            {Object.entries(progressByFile).map(([name, pct]) => (
              <div key={name} className="space-y-1">
                <div className="flex justify-between text-sm text-gray-700">
                  <span className="truncate max-w-[60%]" title={name}>{name}</span>
                  <div className="flex items-center gap-2">
                    <span>{pct}%</span>
                    <button
                      type="button"
                      className="px-2 py-0.5 rounded border border-gray-300 text-gray-700 text-xs hover:bg-gray-50"
                      onClick={() => {
                        const xhr = xhrByNameRef.current[name]
                        if (xhr) xhr.abort()
                        setErrorsByFile((prev) => ({ ...prev, [name]: 'Cancelled by user' }))
                        setProgressByFile((prev) => ({ ...prev, [name]: 0 }))
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-[#0D99FF] h-2 rounded-full" style={{ width: `${pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {Object.keys(errorsByFile).length > 0 && (
        <div className="rounded-2xl bg-red-50 border border-red-200 p-4">
          <h4 className="font-medium text-red-900 mb-2">Upload errors</h4>
          <div className="mb-2">
            <button
              type="button"
              className="px-2 py-1 rounded border border-red-200 text-red-700 text-xs hover:bg-red-100"
              onClick={() => setErrorsByFile({})}
            >
              Clear errors
            </button>
          </div>
          <ul className="space-y-1 text-sm text-red-800">
            {Object.entries(errorsByFile).map(([name, err]) => (
              <li key={name}>
                <span className="font-medium">{name}:</span> {err}
              </li>
            ))}
          </ul>
        </div>
      )}

      {Object.keys(warningsByFile).length > 0 && (
        <div className="rounded-2xl bg-yellow-50 border border-yellow-200 p-4">
          <h4 className="font-medium text-yellow-900 mb-2">File warnings</h4>
          <div className="mb-2">
            <button
              type="button"
              className="px-2 py-1 rounded border border-yellow-200 text-yellow-700 text-xs hover:bg-yellow-100"
              onClick={() => setWarningsByFile({})}
            >
              Clear warnings
            </button>
          </div>
          <ul className="space-y-1 text-sm text-yellow-800">
            {Object.entries(warningsByFile).map(([name, warnings]) => (
              <li key={name}>
                <span className="font-medium">{name}:</span>
                <ul className="ml-4 mt-1">
                  {warnings.map((warning, i) => (
                    <li key={i} className="text-xs">• {warning}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      )}

      {uploaded.length > 0 && (
        <div className="rounded-2xl bg-white shadow-sm p-6">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-lg font-semibold text-gray-900">Uploaded files</h4>
            <button
              type="button"
              className="px-2 py-1 rounded border border-gray-300 text-gray-700 text-xs hover:bg-gray-50"
              onClick={() => setUploaded([])}
            >
              Clear completed
            </button>
          </div>
          <ul className="space-y-2 text-sm text-gray-700">
            {uploaded.map((f) => {
              const isImage = (f.mimeType || '').startsWith('image/')
              return (
                <li key={f.id} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {isImage ? (
                      <img src={f.url} alt={f.originalName} className="w-10 h-10 rounded object-cover border border-gray-200" />
                    ) : (
                      <div className="w-10 h-10 rounded bg-gray-100 border border-gray-200 flex items-center justify-center text-xs text-gray-500">{(f.mimeType || 'file').split('/')[0]}</div>
                    )}
                    <span className="truncate max-w-[40vw]" title={f.originalName}>{f.originalName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CopyButton value={f.url} label="Copy URL" />
                    <a
                      href={f.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#0D99FF] hover:underline"
                    >
                      View
                    </a>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}


