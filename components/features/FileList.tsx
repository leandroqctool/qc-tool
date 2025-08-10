import { getR2Client } from '../../lib/r2'
import { ListObjectsV2Command, _Object } from '@aws-sdk/client-s3'

export const runtime = 'nodejs'

export default async function FileList() {
  const bucket = process.env.R2_BUCKET as string
  if (!bucket) {
    return <div className="rounded-2xl bg-white p-4 text-sm text-red-700 border border-red-200">R2_BUCKET not configured</div>
  }

  try {
    const client = getR2Client()
    const resp = await client.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: 'uploads/' }))
    const items: _Object[] = resp.Contents ?? []
    return (
      <div className="rounded-2xl bg-white shadow-sm p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900">Recent files</h3>
        </div>
        <div className="divide-y">
          {items.length === 0 && <div className="text-sm text-gray-500">No files found</div>}
          {items.map((obj) => (
            <div key={obj.Key} className="py-2 flex items-center justify-between text-sm">
              <div className="truncate max-w-[70%]">{obj.Key}</div>
              <div className="text-gray-500">{obj.Size ?? 0} bytes</div>
            </div>
          ))}
        </div>
      </div>
    )
  } catch {
    return <div className="rounded-2xl bg-white p-4 text-sm text-red-700 border border-red-200">Failed to list files</div>
  }
}


