import { headers } from 'next/headers'
import Link from 'next/link'

type FileRow = {
  id: string
  originalName: string
  size: string
  mimeType: string
  status: string
}

export default async function RecentFiles() {
  const hdrs = await headers()
  const host = hdrs.get('host') || 'localhost:3000'
  const cookie = hdrs.get('cookie') || ''
  const proto = process.env.NODE_ENV === 'production' ? 'https' : 'http'
  const url = `${proto}://${host}/api/files/list?perPage=6&page=1`
  let rows: Array<FileRow> = []
  try {
    const res = await fetch(url, { cache: 'no-store', headers: { cookie } })
    if (res.ok) {
      const data = (await res.json()) as { files: Array<FileRow> }
      rows = data.files ?? []
    }
  } catch {}

  return (
    <section className="rounded-2xl bg-white shadow-sm p-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-900">Recent Files</h3>
        <Link href="/files" className="text-sm text-[#0D99FF] hover:underline">View all</Link>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {rows.map((f) => (
          <div key={f.id} className="rounded-xl border border-gray-200 p-4">
            <div className="text-gray-900 font-medium truncate" title={f.originalName}>{f.originalName}</div>
            <div className="text-xs text-gray-600 mt-1">{f.mimeType}</div>
            <div className="text-xs text-gray-500 mt-1">{f.size}</div>
          </div>
        ))}
        {rows.length === 0 && <div className="text-sm text-gray-500">No recent files</div>}
      </div>
    </section>
  )
}


