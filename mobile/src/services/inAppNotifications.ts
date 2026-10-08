import {
  collection,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../config/firebase';

export function isInAppNotificationRead(item: { read?: boolean }): boolean {
  return item.read === true;
}

export async function markInAppNotificationRead(uid: string, notificationId: string): Promise<boolean> {
  try {
    await updateDoc(doc(db, 'users', uid, 'notifications', notificationId), { read: true });
    return true;
  } catch (error) {
    console.warn('Failed to mark notification read:', error);
    return false;
  }
}

export async function markAnnouncementNotificationsRead(
  uid: string,
  announcementId: string
): Promise<void> {
  if (!uid || !announcementId) return;
  try {
    const snap = await getDocs(
      query(
        collection(db, 'users', uid, 'notifications'),
        where('announcementId', '==', announcementId)
      )
    );
    const unread = snap.docs.filter((d) => d.data().read !== true);
    await Promise.all(unread.map((d) => updateDoc(d.ref, { read: true })));
  } catch (error) {
    console.warn('Failed to mark announcement notifications read:', error);
  }
}

const BATCH_LIMIT = 450;

export async function markAllInAppNotificationsRead(uid: string): Promise<number> {
  const snap = await getDocs(query(collection(db, 'users', uid, 'notifications'), where('read', '==', false)));
  for (let i = 0; i < snap.docs.length; i += BATCH_LIMIT) {
    const batch = writeBatch(db);
    snap.docs.slice(i, i + BATCH_LIMIT).forEach((d) => batch.update(d.ref, { read: true }));
    await batch.commit();
  }
  return snap.docs.length;
}
