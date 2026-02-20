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

/**
 * Upload an event image to Firebase Storage and return the download URL.
 * Path: schools/{schoolId}/events/{eventId}.{ext}
 */
export async function uploadEventImage(
  file: File,
  schoolId: string,
  eventId: string
): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const path = `schools/${schoolId}/events/${eventId}.${ext}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file, { contentType: file.type || 'image/jpeg' });
  return getDownloadURL(storageRef);
}

/**
 * Upload an event document (PDF, etc.) to Firebase Storage and return the download URL.
 * Path: schools/{schoolId}/events/{eventId}/documents/{docId}.{ext}
 */
export async function uploadEventDocument(
  file: File,
  schoolId: string,
  eventId: string,
  docId: string
): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'pdf';
  const path = `schools/${schoolId}/events/${eventId}/documents/${docId}.${ext}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file, { contentType: file.type || 'application/octet-stream' });
  return getDownloadURL(storageRef);
}

/**
 * Upload an announcement image to Firebase Storage and return the download URL.
 * Path: schools/{schoolId}/announcements/{announcementId}.{ext}
 */
export async function uploadAnnouncementImage(
  file: File,
  schoolId: string,
  announcementId: string
): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const path = `schools/${schoolId}/announcements/${announcementId}.${ext}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file, { contentType: file.type || 'image/jpeg' });
  return getDownloadURL(storageRef);
}

/**
 * Upload an announcement document (PDF, etc.) to Firebase Storage and return the download URL.
 * Path: schools/{schoolId}/announcements/{announcementId}/documents/{docId}.{ext}
 */
export async function uploadAnnouncementDocument(
  file: File,
  schoolId: string,
  announcementId: string,
  docId: string
): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'pdf';
  const path = `schools/${schoolId}/announcements/${announcementId}/documents/${docId}.${ext}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file, { contentType: file.type || 'application/octet-stream' });
  return getDownloadURL(storageRef);
}
