import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { createInAppNotificationsForUserIds, getEligibleParentUserIds, getStaffUserIdsForSchool } from '../lib/notifications/recipients';
import { getFcmTokensForSchool } from '../lib/notifications/schoolTokens';
import { childEnrollmentIsActive } from '../lib/util';

// Daily job: send reminder push notifications for announcements posted 24–48h ago.
export const sendAnnouncementReminders = functions.pubsub
  .schedule('0 9 * * *') // 9 AM daily
  .timeZone('Africa/Johannesburg')
  .onRun(async () => {
    const db = admin.firestore();
    const now = new Date();
    const to = new Date(now);
    to.setTime(to.getTime() - 24 * 60 * 60 * 1000); // 24h ago
    const from = new Date(to);
    from.setTime(from.getTime() - 24 * 60 * 60 * 1000); // 48h ago

    const fromIso = from.toISOString();
    const toIso = to.toISOString();

    const schoolsSnap = await db.collection('schools').get();
    for (const schoolDoc of schoolsSnap.docs) {
      const schoolId = schoolDoc.id;
      const annSnap = await db.collection('schools').doc(schoolId).collection('announcements')
        .where('createdAt', '>=', fromIso)
        .where('createdAt', '<', toIso)
        .get();

      for (const annDoc of annSnap.docs) {
        const ann = annDoc.data() as { reminderSentAt?: string; title?: string };
        if (ann.reminderSentAt) continue;
        const title = (ann.title && String(ann.title).trim()) || 'Announcement';

        const tokens = await getFcmTokensForSchool(db, schoolId, {
          parentPref: 'announcements',
          filterStaffByAnnouncementsPref: true,
        });
        const staffUserIds = await getStaffUserIdsForSchool(db, schoolId, { filterStaffByAnnouncementsPref: true });
        const childrenSnap = await db.collection('schools').doc(schoolId).collection('children').get();
        const parentIds = new Set<string>();
        childrenSnap.docs.forEach((d) => {
          const row = d.data() as { parentIds?: string[]; isActive?: boolean };
          if (!childEnrollmentIsActive(row)) return;
          const parentIdsArr = row.parentIds || [];
          parentIdsArr.forEach((uid: string) => parentIds.add(uid));
        });
        const parentUserIds = await getEligibleParentUserIds(db, Array.from(parentIds), 'announcements');
        await createInAppNotificationsForUserIds(db, [...staffUserIds, ...parentUserIds], {
          title: `Reminder: ${title}`,
          body: 'Tap to view this announcement.',
          data: { type: 'announcement_reminder', schoolId, announcementId: annDoc.id },
        });
        if (tokens.length === 0) continue;
        const message: admin.messaging.MulticastMessage = {
          tokens,
          notification: {
            title: `Reminder: ${title}`,
            body: 'Tap to view this announcement.',
          },
          data: { type: 'announcement_reminder', schoolId, announcementId: annDoc.id },
          android: { priority: 'high' as const },
          apns: { payload: { aps: { sound: 'default' } } },
        };
        try {
          await admin.messaging().sendEachForMulticast(message);
          await annDoc.ref.update({ reminderSentAt: new Date().toISOString() });
          functions.logger.info('sendAnnouncementReminders: sent reminder for', annDoc.id, schoolId);
        } catch (e) {
          functions.logger.error('sendAnnouncementReminders: failed', annDoc.id, e);
        }
      }
    }
    return null;
  });
