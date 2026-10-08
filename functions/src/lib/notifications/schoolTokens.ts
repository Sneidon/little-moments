import * as admin from 'firebase-admin';
import { ParentNotificationPrefKey, getFcmTokensForParentUserIds, parentNotificationPreferenceAllows } from './recipients';
import { userHasRole } from '../roles';
import { childEnrollmentIsActive } from '../util';

// Collect FCM tokens for staff + parents at school. Parents are filtered by notificationPreferences[key] when parentPref is set.
export async function getFcmTokensForSchool(
  db: admin.firestore.Firestore,
  schoolId: string,
  options?: {
    parentPref?: ParentNotificationPrefKey | null;
    /** When true, skip staff whose notificationPreferences.announcements === false (teachers/principals). */
    filterStaffByAnnouncementsPref?: boolean;
  }
): Promise<string[]> {
  const tokens: string[] = [];
  const seen = new Set<string>();

  const staffSnap = await db.collection('users').where('schoolId', '==', schoolId).get();
  staffSnap.docs.forEach((d) => {
    const data = d.data() as {
      fcmTokens?: string[];
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
    (data.fcmTokens || []).forEach((t: string) => {
      if (t && !seen.has(t)) {
        seen.add(t);
        tokens.push(t);
      }
    });
  });

  const childrenSnap = await db.collection('schools').doc(schoolId).collection('children').get();
  const parentIds = new Set<string>();
  childrenSnap.docs.forEach((d) => {
    const row = d.data() as { parentIds?: string[]; isActive?: boolean };
    if (!childEnrollmentIsActive(row)) return;
    const parentIdsArr = row.parentIds || [];
    parentIdsArr.forEach((uid: string) => parentIds.add(uid));
  });

  const parentPref = options?.parentPref !== undefined ? options.parentPref : null;
  const parentTokens = await getFcmTokensForParentUserIds(db, Array.from(parentIds), parentPref);
  parentTokens.forEach((t) => {
    if (t && !seen.has(t)) {
      seen.add(t);
      tokens.push(t);
    }
  });
  return tokens;
}

// Parents of children in a class. No per-type pref (daily communication has no matching toggle yet).
export async function getFcmTokensForClass(db: admin.firestore.Firestore, schoolId: string, classId: string): Promise<string[]> {
  const childrenSnap = await db
    .collection('schools')
    .doc(schoolId)
    .collection('children')
    .where('classId', '==', classId)
    .get();
  const parentIds = new Set<string>();
  childrenSnap.docs.forEach((d) => {
    const row = d.data() as { parentIds?: string[]; isActive?: boolean };
    if (!childEnrollmentIsActive(row)) return;
    const parentIdsArr = row.parentIds || [];
    parentIdsArr.forEach((uid: string) => parentIds.add(uid));
  });
  return getFcmTokensForParentUserIds(db, Array.from(parentIds), null);
}
