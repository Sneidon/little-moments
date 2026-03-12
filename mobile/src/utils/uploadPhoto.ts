import * as FileSystem from 'expo-file-system';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../config/firebase';

/**
 * Create a Blob from a local URI (file:// or content://).
 * Uses XMLHttpRequest which handles both URI types correctly on React Native/Expo.
 * See: https://github.com/expo/expo/issues/2402#issuecomment-443726662
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

/**
 * Ensure we have a readable URI. On Android, content:// URIs from the image picker
 * often fail with direct reads. Copy to cache first so XHR can read the file.
 */
async function ensureReadableUri(uri: string): Promise<string> {
  if (uri.startsWith('content://')) {
    const ext = uri.includes('.') ? uri.substring(uri.lastIndexOf('.')) : '.jpg';
    const cacheUri = `${FileSystem.cacheDirectory}upload-${Date.now()}${ext}`;
    await FileSystem.copyAsync({ from: uri, to: cacheUri });
    return cacheUri;
  }
  return uri;
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
  const isVideo = mimeType?.startsWith('video/') ?? localUri.toLowerCase().includes('.mp4') ?? localUri.toLowerCase().includes('.mov');
  const ext = isVideo ? (mimeType?.includes('mp4') ? '.mp4' : '.mov') : '.jpg';
  const contentType = isVideo ? (mimeType || 'video/mp4') : 'image/jpeg';

  const readableUri = await ensureReadableUri(localUri);
  const blob = await uriToBlob(readableUri);
  const filename = `${Date.now()}${ext}`;
  const path = `schools/${schoolId}/children/${childId}/media/${filename}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, blob, { contentType });
  const url = await getDownloadURL(storageRef);
  return { url, mediaType: isVideo ? 'video' : 'image' };
}
