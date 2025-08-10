import { headers } from 'next/headers'

export default async function FilesTable() {
  const hdrs = await headers()
  const host = hdrs.get('host') || 'localhost:3000'
  const cookie = hdrs.get('cookie') || ''
  const proto = process.env.NODE_ENV === 'production' ? 'https' : 'http'
  const url = `${proto}://${host}/api/files/list`
  let rows: Array<any> = []
  try {
    const res = await fetch(url, { cache: 'no-store', headers: { cookie } })
    if (res.ok) {
      const data = (await res.json()) as { files: Array<any> }
      rows = data.files ?? []
    }
  } catch {
    rows = []
  }
  return (
    <div className="rounded-2xl bg-white shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-3">Files</h3>
      <div className="overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b">
              <th className="py-2 pr-4">Name</th>
              <th className="py-2 pr-4">Size</th>
              <th className="py-2 pr-4">Type</th>
              <th className="py-2 pr-4">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((f) => (
              <tr key={f.id} className="border-b last:border-0">
                <td className="py-2 pr-4 truncate max-w-[360px]">{f.originalName}</td>
                <td className="py-2 pr-4">{f.size}</td>
                <td className="py-2 pr-4">{f.mimeType}</td>
                <td className="py-2 pr-4">{f.status}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="py-4 text-gray-500">No files yet</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}


