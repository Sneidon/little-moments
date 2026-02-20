import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/config/firebase';

/**
 * Upload a file to Firebase Storage and return the download URL.
 * Path: schools/{schoolId}/mealOptions/{optionId}.jpg
 */
export async function uploadMealOptionImage(
  file: File,
  schoolId: string,
  optionId: string
): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const path = `schools/${schoolId}/mealOptions/${optionId}.${ext}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file, { contentType: file.type || 'image/jpeg' });
  return getDownloadURL(storageRef);
}
