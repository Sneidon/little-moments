import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/config/firebase';
import { assertVideoFileSize } from '@/lib/media';

async function uploadSchoolMediaFile(
  file: File,
  path: string,
  defaultContentType: string
): Promise<string> {
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file, { contentType: file.type || defaultContentType });
  return getDownloadURL(storageRef);
}

/**
 * Upload user avatar. Path: users/{uid}/avatar.{ext}
 */
export async function uploadUserAvatar(file: File, uid: string): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const path = `users/${uid}/avatar.${ext}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file, { contentType: file.type || 'image/jpeg' });
  return getDownloadURL(storageRef);
}

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
  return uploadSchoolMediaFile(file, path, 'image/jpeg');
}

/**
 * Upload an event video to Firebase Storage and return the download URL.
 * Path: schools/{schoolId}/events/{eventId}/video.{ext}
 */
export async function uploadEventVideo(
  file: File,
  schoolId: string,
  eventId: string
): Promise<string> {
  assertVideoFileSize(file);
  const ext = file.name.split('.').pop()?.toLowerCase() || 'mp4';
  const path = `schools/${schoolId}/events/${eventId}/video.${ext}`;
  return uploadSchoolMediaFile(file, path, 'video/mp4');
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
  return uploadSchoolMediaFile(file, path, 'image/jpeg');
}

/**
 * Upload an announcement video to Firebase Storage and return the download URL.
 * Path: schools/{schoolId}/announcements/{announcementId}/video.{ext}
 */
export async function uploadAnnouncementVideo(
  file: File,
  schoolId: string,
  announcementId: string
): Promise<string> {
  assertVideoFileSize(file);
  const ext = file.name.split('.').pop()?.toLowerCase() || 'mp4';
  const path = `schools/${schoolId}/announcements/${announcementId}/video.${ext}`;
  return uploadSchoolMediaFile(file, path, 'video/mp4');
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
