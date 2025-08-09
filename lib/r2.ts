import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

export function getR2Client() {
  const accountId = process.env.R2_ACCOUNT_ID
  const accessKeyId = process.env.R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY
  const explicitEndpoint = process.env.R2_ENDPOINT
  const region = 'auto'
  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error('Missing R2 env vars')
  }
  return new S3Client({
    region,
    endpoint: explicitEndpoint || `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
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
  const url = await getSignedUrl(client, command, { expiresIn: params.expiresIn ?? 900 })
  return url
}


