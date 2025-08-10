import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

function resolveEndpointAndStyle() {
  const accountId = process.env.R2_ACCOUNT_ID
  const bucket = process.env.R2_BUCKET
  const explicitEndpoint = process.env.R2_ENDPOINT
  const base = explicitEndpoint || (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : undefined)
  if (!base) return { endpoint: undefined as unknown as string, forcePathStyle: true }
  try {
    const url = new URL(base)
    const host = url.hostname
    const isBucketEndpoint = !!bucket && host.startsWith(`${bucket}.`)
    // If using bucket endpoint like https://<bucket>.<account>.<region>.r2..., use virtual-hosted style (no /bucket/ in path)
    // Otherwise, for account endpoint like https://<account>.r2..., use path-style (/bucket/key)
    return { endpoint: url.toString().replace(/\/$/, ''), forcePathStyle: !isBucketEndpoint, bucketEndpoint: isBucketEndpoint }
  } catch {
    return { endpoint: base, forcePathStyle: true, bucketEndpoint: false }
  }
}

export function getR2Client() {
  const accountId = process.env.R2_ACCOUNT_ID
  const accessKeyId = process.env.R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY
  const region = 'auto'
  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error('Missing R2 env vars')
  }
  const { endpoint, forcePathStyle, bucketEndpoint } = resolveEndpointAndStyle()
  return new S3Client({
    region,
    endpoint: endpoint || `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle,
    bucketEndpoint,
  })
}

export async function createPresignedPutUrl(params: {
  bucket: string
  key: string
  contentType: string
  expiresIn?: number
}) {
  const client = getR2Client()
  const command = new PutObjectCommand({
    Bucket: params.bucket,
    Key: params.key,
    ContentType: params.contentType,
  })
  const url = await getSignedUrl(client, command, {
    expiresIn: params.expiresIn ?? 900,
    // Prevent SDK from hoisting checksum headers into the query string for presigned URLs
    unsignableHeaders: new Set(['x-amz-checksum-crc32', 'x-amz-sdk-checksum-algorithm']),
  })
  return url
}


