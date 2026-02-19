import * as FileSystem from 'expo-file-system';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../config/firebase';

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
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
