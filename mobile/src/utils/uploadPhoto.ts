import * as FileSystem from 'expo-file-system';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, storage } from '../config/firebase';

const STORAGE_BUCKET = process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET;

/** Videos above this size are rejected before upload (Firebase / device limits). */
const MAX_VIDEO_BYTES = 80 * 1024 * 1024;

/**
 * Create a Blob from a local URI (file:// or content://).
 * Fine for photos; do not use for large videos (OOM risk).
 */
async function uriToBlob(uri: string): Promise<Blob> {
  return new Promise<Blob>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onload = () => resolve(xhr.response as Blob);
    xhr.onerror = (e) => reject(new TypeError(`Failed to read file: ${e?.type ?? 'unknown'}`));
    xhr.responseType = 'blob';
    xhr.open('GET', uri, true);
    xhr.send(null);
  });
}

function isVideoMime(mimeType?: string, uri?: string): boolean {
  if (mimeType?.startsWith('video/')) return true;
  if (!uri) return false;
  return /\.(mp4|mov|m4v|webm)(\?|#|$)/i.test(uri);
}

/**
 * Ensure we have a readable file:// URI. On Android, content:// URIs from the picker
 * often fail with direct reads — copy to cache first.
 */
async function ensureReadableUri(uri: string, mimeType?: string): Promise<string> {
  if (uri.startsWith('file://')) return uri;
  if (uri.startsWith('content://')) {
    const isVideo = isVideoMime(mimeType, uri);
    const ext = isVideo ? '.mp4' : uri.includes('.') ? uri.substring(uri.lastIndexOf('.')) : '.jpg';
    const cacheUri = `${FileSystem.cacheDirectory}upload-${Date.now()}${ext}`;
    await FileSystem.copyAsync({ from: uri, to: cacheUri });
    return cacheUri;
  }
  return uri;
}

async function assertVideoSizeOk(uri: string): Promise<void> {
  const info = await FileSystem.getInfoAsync(uri, { size: true });
  if (!info.exists) throw new Error('Video file not found.');
  const size = 'size' in info && typeof info.size === 'number' ? info.size : 0;
  if (size > MAX_VIDEO_BYTES) {
    throw new Error('Video is too large. Try a shorter clip or lower quality.');
  }
}

/**
 * Upload a video by streaming from disk (avoids loading the whole file into JS memory).
 */
async function uploadVideoFromUriAsync(
  localUri: string,
  storagePath: string,
  contentType: string,
  mimeType?: string
): Promise<string> {
  if (!STORAGE_BUCKET) throw new Error('Storage bucket is not configured.');

  const readableUri = await ensureReadableUri(localUri, mimeType);
  await assertVideoSizeOk(readableUri);

  const user = auth.currentUser;
  if (!user) throw new Error('Not signed in');

  const token = await user.getIdToken();
  const uploadUrl = `https://firebasestorage.googleapis.com/v0/b/${STORAGE_BUCKET}/o?uploadType=media&name=${encodeURIComponent(storagePath)}`;

  const result = await FileSystem.uploadAsync(uploadUrl, readableUri, {
    httpMethod: 'POST',
    uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': contentType,
    },
  });

  if (result.status < 200 || result.status >= 300) {
    let detail = result.body?.slice(0, 200) ?? '';
    try {
      const errJson = JSON.parse(result.body) as { error?: { message?: string } };
      detail = errJson.error?.message ?? detail;
    } catch {
      /* use raw body */
    }
    throw new Error(detail ? `Video upload failed: ${detail}` : `Video upload failed (${result.status})`);
  }

  const body = JSON.parse(result.body) as { name?: string; downloadTokens?: string };
  if (body.name && body.downloadTokens) {
    return `https://firebasestorage.googleapis.com/v0/b/${STORAGE_BUCKET}/o/${encodeURIComponent(body.name)}?alt=media&token=${body.downloadTokens}`;
  }

  return getDownloadURL(ref(storage, storagePath));
}

/**
 * Upload a local photo (file URI) to Firebase Storage.
 */
export async function uploadPhotoAsync(
  localUri: string,
  schoolId: string,
  childId: string
): Promise<string> {
  const readableUri = await ensureReadableUri(localUri);
  const blob = await uriToBlob(readableUri);
  const filename = `${Date.now()}.jpg`;
  const path = `schools/${schoolId}/children/${childId}/photos/${filename}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, blob, { contentType: 'image/jpeg' });
  return getDownloadURL(storageRef);
}

/**
 * Upload a local media file (photo or video) to Firebase Storage.
 * Returns { url, mediaType }.
 */
export async function uploadMediaAsync(
  localUri: string,
  schoolId: string,
  childId: string,
  mimeType?: string
): Promise<{ url: string; mediaType: string }> {
  const isVideo = isVideoMime(mimeType, localUri);
  const ext = isVideo ? (mimeType?.includes('quicktime') || localUri.toLowerCase().includes('.mov') ? '.mov' : '.mp4') : '.jpg';
  const contentType = isVideo ? mimeType || 'video/mp4' : 'image/jpeg';
  const filename = `${Date.now()}${ext}`;
  const path = `schools/${schoolId}/children/${childId}/media/${filename}`;

  if (isVideo) {
    const url = await uploadVideoFromUriAsync(localUri, path, contentType, mimeType);
    return { url, mediaType: 'video' };
  }

  const readableUri = await ensureReadableUri(localUri, mimeType);
  const blob = await uriToBlob(readableUri);
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, blob, { contentType });
  const url = await getDownloadURL(storageRef);
  return { url, mediaType: 'image' };
};
