"use client"

import { useCallback, useState } from 'react'

type UploadResult = {
  id: string
  originalName: string
  url: string
}

export default function FileUpload() {
  const [isUploading, setIsUploading] = useState(false)
  const [progressByFile, setProgressByFile] = useState<Record<string, number>>({})
  const [errorsByFile, setErrorsByFile] = useState<Record<string, string>>({})
  const [uploaded, setUploaded] = useState<UploadResult[]>([])

  const onSelectFiles = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    setIsUploading(true)
    setErrorsByFile({})

    const uploads = Array.from(files).map(async (file) => {
      try {
        setProgressByFile((prev) => ({ ...prev, [file.name]: 0 }))

        const presignRes = await fetch('/api/files/upload-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: file.name, contentType: file.type, size: file.size }),
        })

        if (!presignRes.ok) {
          const err = await presignRes.json().catch(() => ({ error: 'Failed to get upload URL' }))
          throw new Error(err.error || 'Failed to get upload URL')
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
          xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve()
            } else {
              reject(new Error('Upload failed'))
            }
          })
          xhr.addEventListener('error', () => reject(new Error('Upload failed')))
          xhr.open('PUT', uploadUrl)
          xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream')
          xhr.send(file)
        })

        setUploaded((prev) => [...prev, fileRecord])
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Upload failed'
        setErrorsByFile((prev) => ({ ...prev, [file.name]: message }))
      }
    })

    await Promise.all(uploads)
    setIsUploading(false)
  }, [])

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-white shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Upload files</h3>
            <p className="text-sm text-gray-600">Direct-to-R2 uploads using presigned URLs</p>
          </div>
          <label className="inline-flex items-center px-4 py-2 rounded-lg bg-[#0D99FF] text-white hover:bg-[#0B87E5] cursor-pointer">
            <input type="file" multiple className="hidden" onChange={onSelectFiles} />
            Choose files
          </label>
        </div>

        {isUploading && (
          <div className="mt-4 space-y-2">
            {Object.entries(progressByFile).map(([name, pct]) => (
              <div key={name} className="space-y-1">
                <div className="flex justify-between text-sm text-gray-700">
                  <span className="truncate max-w-[70%]" title={name}>{name}</span>
                  <span>{pct}%</span>
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
          <ul className="space-y-1 text-sm text-red-800">
            {Object.entries(errorsByFile).map(([name, err]) => (
              <li key={name}>
                <span className="font-medium">{name}:</span> {err}
              </li>
            ))}
          </ul>
        </div>
      )}

      {uploaded.length > 0 && (
        <div className="rounded-2xl bg-white shadow-sm p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-2">Uploaded files</h4>
          <ul className="space-y-2 text-sm text-gray-700">
            {uploaded.map((f) => (
              <li key={f.id} className="flex items-center justify-between">
                <span className="truncate max-w-[70%]" title={f.originalName}>{f.originalName}</span>
                <a
                  href={f.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#0D99FF] hover:underline"
                >
                  View
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}


