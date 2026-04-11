import * as Crypto from 'expo-crypto'
import * as FileSystem from 'expo-file-system/legacy'

import { confirmUpload, getUploadUrl } from './api'

/**
 * Upload a local image to R2 via the signed URL pipeline.
 * Mirrors the web app's upload flow with hash-based deduplication.
 * HEIC files are converted to JPEG server-side in the API routes.
 */
export async function uploadImage(localUri: string): Promise<string> {
  // 1. Get file info
  const fileInfo = await FileSystem.getInfoAsync(localUri)
  if (!fileInfo.exists) throw new Error('File not found')

  // 2. Read file and compute SHA-256 hash for dedup
  const fileContent = await FileSystem.readAsStringAsync(localUri, {
    encoding: 'base64',
  })
  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    fileContent
  )

  const filename = `mobile_${Date.now()}.jpg`
  const fileSize = fileInfo.size ?? 0
  const mimeType = 'image/jpeg'

  // 3. Request signed upload URL (checks for dedup)
  const uploadData = await getUploadUrl({ filename, hash, fileSize, mimeType })

  // 4. If already exists, return cached public URL
  if (uploadData.exists && uploadData.publicUrl) {
    return uploadData.publicUrl
  }

  if (!uploadData.signedUrl || !uploadData.path) {
    throw new Error('Failed to get upload URL')
  }

  // 5. Upload binary to R2 signed URL
  await FileSystem.uploadAsync(uploadData.signedUrl, localUri, {
    httpMethod: 'PUT',
    headers: { 'Content-Type': mimeType },
    uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
  })

  // 6. Use server-provided public URL and confirm upload
  const publicUrl = uploadData.publicUrl!

  if (uploadData.uploadMeta) {
    const { path: storagePath, ...rest } = uploadData.uploadMeta
    await confirmUpload({
      ...rest,
      storagePath,
      publicUrl,
    })
  }

  return publicUrl
}
