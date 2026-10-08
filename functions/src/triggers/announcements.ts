import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { createInAppNotificationsForUserIds, getEligibleParentUserIds, getStaffUserIdsForSchool } from '../lib/notifications/recipients';
import { getFcmTokensForClass, getFcmTokensForSchool } from '../lib/notifications/schoolTokens';
import { childEnrollmentIsActive } from '../lib/util';

// When daily communication (planned activity) is created, notify parents in that class.
export const onDailyCommunicationCreated = functions.firestore
  .document('schools/{schoolId}/dailyCommunications/{docId}')
  .onCreate(async (snap, context) => {
    const { schoolId } = context.params;
    const data = snap.data() as { classId?: string; message?: string };
    const classId = data.classId;
    if (!classId) return null;
    const message = (data.message && String(data.message).trim()) ? String(data.message).trim().slice(0, 120) : 'Planned activity for today';
    const db = admin.firestore();
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
    const parentUserIds = await getEligibleParentUserIds(db, Array.from(parentIds), null);
    await createInAppNotificationsForUserIds(db, parentUserIds, {
      title: 'Planned activity for today',
      body: message.length >= 120 ? `${message}…` : message,
      data: { type: 'daily_communication', schoolId },
    });
    const tokens = await getFcmTokensForClass(db, schoolId, classId);
    if (tokens.length === 0) {
      functions.logger.info('onDailyCommunicationCreated: no FCM tokens for class', classId);
      return null;
    }
    const msg: admin.messaging.MulticastMessage = {
      tokens,
      notification: {
        title: 'Planned activity for today',
        body: message.length >= 120 ? `${message}…` : message,
      },
      data: { type: 'daily_communication', schoolId },
      android: { priority: 'high' as const },
      apns: { payload: { aps: { sound: 'default', badge: 1 } } },
    };
    try {
      const res = await admin.messaging().sendEachForMulticast(msg);
      functions.logger.info('onDailyCommunicationCreated: sent', res.successCount, 'schoolId', schoolId);
    } catch (e) {
      functions.logger.error('onDailyCommunicationCreated: send failed', e);
    }
    return null;
  });

// When an announcement is created, send push notifications to all school staff and parents.
export const onAnnouncementCreated = functions.firestore
  .document('schools/{schoolId}/announcements/{announcementId}')
  .onCreate(async (snap, context) => {
    const { schoolId } = context.params;
    const data = snap.data() as { title?: string; body?: string };
    const title = (data.title && String(data.title).trim()) || 'New announcement';
    const body = (data.body && String(data.body).trim()) ? String(data.body).trim().slice(0, 150) : '';

    const db = admin.firestore();
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
    const notifTitle = `New: ${title}`;
    const notifBody = body ? (body.length >= 150 ? `${body}…` : body) : 'Tap to view.';
    await createInAppNotificationsForUserIds(db, [...staffUserIds, ...parentUserIds], {
      title: notifTitle,
      body: notifBody,
      data: { type: 'announcement', schoolId, announcementId: context.params.announcementId },
    });
    const tokens = await getFcmTokensForSchool(db, schoolId, {
      parentPref: 'announcements',
      filterStaffByAnnouncementsPref: true,
    });
    if (tokens.length === 0) {
      functions.logger.info('onAnnouncementCreated: no FCM tokens for school', schoolId);
      return null;
    }

    const message: admin.messaging.MulticastMessage = {
      tokens,
      notification: {
        title: `New: ${title}`,
        body: body ? (body.length >= 150 ? `${body}…` : body) : 'Tap to view.',
      },
      data: { type: 'announcement', schoolId, announcementId: context.params.announcementId },
      android: { priority: 'high' as const },
      apns: { payload: { aps: { sound: 'default', badge: 1 } } },
    };
    try {
      const res = await admin.messaging().sendEachForMulticast(message);
      functions.logger.info('onAnnouncementCreated: sent', res.successCount, 'failed', res.failureCount, 'schoolId', schoolId);
    } catch (e) {
      functions.logger.error('onAnnouncementCreated: send failed', e);
    }
    return null;
  });
