import * as admin from 'firebase-admin';

export async function storageUploadPngAndGetSignedUrl(params: {
  schoolId: string;
  path: string;
  buffer: Buffer;
  cacheControl?: string;
}): Promise<string> {
  const bucket = admin.storage().bucket();
  const file = bucket.file(params.path);
  await file.save(params.buffer, {
    contentType: 'image/png',
    resumable: false,
    metadata: {
      cacheControl: params.cacheControl ?? 'public, max-age=31536000, immutable',
    },
  });
  const [url] = await file.getSignedUrl({
    action: 'read',
    // ~10 years
    expires: Date.now() + 1000 * 60 * 60 * 24 * 365 * 10,
  });
  return url;
}

export async function fetchImageBuffer(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const ab = await res.arrayBuffer();
    return Buffer.from(ab);
  } catch {
    return null;
  }
}
