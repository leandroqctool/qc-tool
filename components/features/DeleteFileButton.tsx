"use client"
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useToast } from '../ui/ToastProvider'

export default function DeleteFileButton({ id, name }: { id: string; name?: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { show } = useToast()

  async function onDelete() {
    if (!confirm(`Delete file${name ? ` "${name}"` : ''}? This cannot be undone.`)) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/files/${id}`, { method: 'DELETE' })
      setLoading(false)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Failed to delete file')
        show('Failed to delete file', 'error')
        return
      }
      router.refresh()
      show('File deleted', 'success')
    } catch {
      setLoading(false)
      setError('Failed to delete file')
      show('Failed to delete file', 'error')
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onDelete}
        disabled={loading}
        className="px-2 py-1 rounded border border-red-300 text-red-700 hover:bg-red-50 text-xs disabled:opacity-60"
      >
        {loading ? 'Deleting…' : 'Delete'}
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  )
}


