import * as admin from 'firebase-admin';
import { userHasRole } from '../roles';

/** Keys aligned with mobile ParentNotificationsScreen / shared NotificationPreferences. */
export type ParentNotificationPrefKey =
  | 'nappyChange'
  | 'napTime'
  | 'meal'
  | 'checkIn'
  | 'checkOut'
  | 'activity'
  | 'medication'
  | 'incident'
  | 'media'
  | 'messages'
  | 'announcements'
  | 'events'
  | 'eventReminders';

export function parentNotificationPreferenceAllows(
  prefs: Record<string, boolean> | undefined,
  key: ParentNotificationPrefKey
): boolean {
  if (!prefs || typeof prefs !== 'object') return true;
  const v = prefs[key];
  if (v === false) return false;
  return true;
}

type InAppNotificationPayload = {
  title: string;
  body: string;
  data: Record<string, string>;
};

export async function createInAppNotificationsForUserIds(
  db: admin.firestore.Firestore,
  userIds: string[],
  payload: InAppNotificationPayload
): Promise<void> {
  if (userIds.length === 0) return;
  const uniqueUserIds = Array.from(new Set(userIds.filter((id) => !!id)));
  if (uniqueUserIds.length === 0) return;
  const now = new Date().toISOString();
  let batch = db.batch();
  let ops = 0;
  for (const uid of uniqueUserIds) {
    const ref = db.collection('users').doc(uid).collection('notifications').doc();
    batch.set(ref, {
      title: payload.title,
      body: payload.body,
      createdAt: now,
      read: false,
      ...payload.data,
    });
    ops++;
    if (ops >= 400) {
      await batch.commit();
      batch = db.batch();
      ops = 0;
    }
  }
  if (ops > 0) await batch.commit();
}

export async function getEligibleParentUserIds(
  db: admin.firestore.Firestore,
  parentIds: string[],
  prefKey: ParentNotificationPrefKey | null
): Promise<string[]> {
  const allowed: string[] = [];
  for (const uid of Array.from(new Set(parentIds))) {
    const userSnap = await db.collection('users').doc(uid).get();
    if (!userSnap.exists) continue;
    const data = userSnap.data() as { isActive?: boolean; notificationPreferences?: Record<string, boolean> };
    if (data.isActive === false) continue;
    if (prefKey && !parentNotificationPreferenceAllows(data.notificationPreferences, prefKey)) continue;
    allowed.push(uid);
  }
  return allowed;
}

export async function getStaffUserIdsForSchool(
  db: admin.firestore.Firestore,
  schoolId: string,
  options?: { filterStaffByAnnouncementsPref?: boolean }
): Promise<string[]> {
  const staffIds: string[] = [];
  const staffSnap = await db.collection('users').where('schoolId', '==', schoolId).get();
  staffSnap.docs.forEach((d) => {
    const data = d.data() as {
      isActive?: boolean;
      role?: string;
      roles?: string[];
      notificationPreferences?: Record<string, boolean>;
    };
    if (data.isActive === false) return;
    if (
      options?.filterStaffByAnnouncementsPref &&
      (userHasRole(data, 'teacher') || userHasRole(data, 'principal')) &&
      !parentNotificationPreferenceAllows(data.notificationPreferences, 'announcements')
    ) {
      return;
    }
    staffIds.push(d.id);
  });
  return staffIds;
}

/** FCM tokens for parent user ids, respecting one preference key (omit category => always allow). */
export async function getFcmTokensForParentUserIds(
  db: admin.firestore.Firestore,
  parentIds: string[],
  prefKey: ParentNotificationPrefKey | null
): Promise<string[]> {
  const tokens: string[] = [];
  const seen = new Set<string>();
  for (const uid of parentIds) {
    const userSnap = await db.collection('users').doc(uid).get();
    if (!userSnap.exists) continue;
    const data = userSnap.data() as {
      fcmTokens?: string[];
      isActive?: boolean;
      notificationPreferences?: Record<string, boolean>;
    };
    if (data.isActive === false) continue;
    if (prefKey && !parentNotificationPreferenceAllows(data.notificationPreferences, prefKey)) continue;
    (data.fcmTokens || []).forEach((t: string) => {
      if (t && !seen.has(t)) {
        seen.add(t);
        tokens.push(t);
      }
    });
  }
  return tokens;
}

/** FCM tokens for specific user ids (staff or parents). Optional pref key; omit to always allow. */
export async function getFcmTokensForUserIds(
  db: admin.firestore.Firestore,
  userIds: string[],
  prefKey: ParentNotificationPrefKey | null = null
): Promise<string[]> {
  const tokens: string[] = [];
  const seen = new Set<string>();
  for (const uid of Array.from(new Set(userIds.filter((id) => !!id)))) {
    const userSnap = await db.collection('users').doc(uid).get();
    if (!userSnap.exists) continue;
    const data = userSnap.data() as {
      fcmTokens?: string[];
      isActive?: boolean;
      notificationPreferences?: Record<string, boolean>;
    };
    if (data.isActive === false) continue;
    if (prefKey && !parentNotificationPreferenceAllows(data.notificationPreferences, prefKey)) continue;
    (data.fcmTokens || []).forEach((t: string) => {
      if (t && !seen.has(t)) {
        seen.add(t);
        tokens.push(t);
      }
    });
  }
  return tokens;
}
