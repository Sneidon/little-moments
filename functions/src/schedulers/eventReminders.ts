import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { createInAppNotificationsForUserIds, getEligibleParentUserIds, getStaffUserIdsForSchool } from '../lib/notifications/recipients';
import { getFcmTokensForSchool } from '../lib/notifications/schoolTokens';
import { childEnrollmentIsActive } from '../lib/util';

// Scheduled event reminders (one day before).
export const sendEventReminders = functions.pubsub
  .schedule('0 8 * * *') // 8 AM daily
  .timeZone('Africa/Johannesburg')
  .onRun(async () => {
    const db = admin.firestore();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const tomorrowEnd = new Date(tomorrow);
    tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);
    const startIso = tomorrow.toISOString();
    const endIso = tomorrowEnd.toISOString();

    const schoolsSnap = await db.collection('schools').get();
    for (const schoolDoc of schoolsSnap.docs) {
      const schoolId = schoolDoc.id;
      const eventsSnap = await db.collection('schools').doc(schoolId).collection('events')
        .where('startAt', '>=', startIso)
        .where('startAt', '<', endIso)
        .get();
      for (const evDoc of eventsSnap.docs) {
        const ev = evDoc.data() as { title?: string; targetType?: string; targetClassIds?: string[] };
        const title = (ev.title && String(ev.title).trim()) || 'Upcoming event';
        const staffUserIds = await getStaffUserIdsForSchool(db, schoolId);
        const childrenSnap = await db.collection('schools').doc(schoolId).collection('children').get();
        const parentIds = new Set<string>();
        childrenSnap.docs.forEach((d) => {
          const row = d.data() as { parentIds?: string[]; isActive?: boolean };
          if (!childEnrollmentIsActive(row)) return;
          const parentIdsArr = row.parentIds || [];
          parentIdsArr.forEach((uid: string) => parentIds.add(uid));
        });
        const parentUserIds = await getEligibleParentUserIds(db, Array.from(parentIds), 'eventReminders');
        await createInAppNotificationsForUserIds(db, [...staffUserIds, ...parentUserIds], {
          title: `Reminder: ${title}`,
          body: 'Happens tomorrow. Tap to view.',
          data: { type: 'event_reminder', schoolId, eventId: evDoc.id },
        });
        const tokens = await getFcmTokensForSchool(db, schoolId, { parentPref: 'eventReminders' });
        if (tokens.length === 0) continue;
        const msg: admin.messaging.MulticastMessage = {
          tokens,
          notification: {
            title: `Reminder: ${title}`,
            body: 'Happens tomorrow. Tap to view.',
          },
          data: { type: 'event_reminder', schoolId, eventId: evDoc.id },
          android: { priority: 'high' as const },
          apns: { payload: { aps: { sound: 'default' } } },
        };
        try {
          await admin.messaging().sendEachForMulticast(msg);
          functions.logger.info('Event reminder sent', evDoc.id, schoolId);
        } catch (e) {
          functions.logger.error('Event reminder failed', evDoc.id, e);
        }
      }
    }
    return null;
  });
