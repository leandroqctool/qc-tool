"use client"

import { useEffect } from 'react'

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    // Optionally log the error to an error reporting service
    // console.error(error)
  }, [error])

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--text-primary)]">
      <div className="max-w-xl mx-auto p-8 mt-24 rounded-2xl bg-white shadow-sm">
        <h2 className="text-2xl font-semibold text-red-700 mb-2">Something went wrong</h2>
        <p className="text-sm text-[var(--text-secondary)] mb-6">{error.message}</p>
        <button
          onClick={() => reset()}
          className="px-4 py-2 rounded-lg bg-[#0D99FF] text-white hover:bg-[#0B99E5]"
        >
          Try again
        </button>
      </div>
    </div>
  )
}


