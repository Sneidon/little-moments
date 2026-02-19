import * as FileSystem from 'expo-file-system';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../config/firebase';

/** Decode base64 to Uint8Array without using atob (not available in React Native). */
function base64ToUint8Array(base64: string): Uint8Array {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const lookup = new Uint8Array(256);
  for (let i = 0; i < chars.length; i++) lookup[chars.charCodeAt(i)] = i;

  const clean = base64.replace(/=+$/, '');
  const bufferLen = Math.floor((clean.length * 3) / 4);
  const bytes = new Uint8Array(bufferLen);
  let p = 0;

  for (let i = 0; i < base64.length; i += 4) {
    const c2 = base64.charCodeAt(i + 2);
    const c3 = base64.charCodeAt(i + 3);
    const n =
      (lookup[base64.charCodeAt(i)] << 18) |
      (lookup[base64.charCodeAt(i + 1)] << 12) |
      (c2 === 61 ? 0 : lookup[c2] << 6) |
      (c3 === 61 ? 0 : lookup[c3]);
    bytes[p++] = (n >> 16) & 0xff;
    if (c2 !== 61) bytes[p++] = (n >> 8) & 0xff;
    if (c3 !== 61) bytes[p++] = n & 0xff;
  }
  return bytes.subarray(0, p);
}

/**
 * Upload a local photo (file URI) to Firebase Storage and return the download URL.
 * Path: schools/{schoolId}/children/{childId}/photos/{timestamp}.jpg
 */
export async function uploadPhotoAsync(
  localUri: string,
  schoolId: string,
  childId: string
): Promise<string> {
  const base64 = await FileSystem.readAsStringAsync(localUri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const bytes = base64ToUint8Array(base64);
  const filename = `${Date.now()}.jpg`;
  const path = `schools/${schoolId}/children/${childId}/photos/${filename}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, bytes, { contentType: 'image/jpeg' });
  return getDownloadURL(storageRef);
}
