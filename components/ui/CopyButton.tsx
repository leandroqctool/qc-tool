"use client"

import { useState } from 'react'
import { useToast } from './ToastProvider'

export default function CopyButton({ value, label = 'Copy', success = 'Copied!' }: { value: string; label?: string; success?: string }) {
  const [copying, setCopying] = useState(false)
  const { show } = useToast()
  async function onCopy() {
    try {
      setCopying(true)
      await navigator.clipboard.writeText(value)
      show(success, 'success')
    } catch {
      show('Failed to copy', 'error')
    } finally {
      setCopying(false)
    }
  }
  return (
    <button onClick={onCopy} disabled={copying} className="px-3 py-1.5 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-sm disabled:opacity-60">
      {copying ? 'Copying…' : label}
    </button>
  )
}


