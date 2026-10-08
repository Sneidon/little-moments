import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { createInAppNotificationsForUserIds, getEligibleParentUserIds, getFcmTokensForParentUserIds } from '../lib/notifications/recipients';
import { buildReportNotificationCopy, reportTypeToNotificationPrefKey } from '../lib/notifications/reportCopy';
import { childEnrollmentIsActive } from '../lib/util';

// When a daily report is created, send FCM to parents (respects notificationPreferences per report type).
// Email: SendGrid not wired yet; add when SENDGRID_API_KEY (or similar) is configured.
export const onReportCreated = functions.firestore
  .document('schools/{schoolId}/children/{childId}/reports/{reportId}')
  .onCreate(async (snap, context) => {
    const { schoolId, childId, reportId } = context.params;
    const report = snap.data() as {
      type?: string;
      notes?: string;
      mealOptionName?: string;
      photoCategory?: string;
    };
    functions.logger.info('Report created', { schoolId, childId, reportId, type: report?.type });

    if (report.type === 'child_joined_class') {
      return null;
    }

    const db = admin.firestore();
    const childSnap = await db.collection('schools').doc(schoolId).collection('children').doc(childId).get();
    if (!childSnap.exists) {
      functions.logger.warn('onReportCreated: child not found', { childId, schoolId });
      return null;
    }
    const child = childSnap.data() as { name?: string; parentIds?: string[]; isActive?: boolean };
    if (!childEnrollmentIsActive(child)) {
      functions.logger.info('onReportCreated: child not actively enrolled — skipping parent notify', { childId });
      return null;
    }
    const parentIds = child.parentIds || [];
    if (parentIds.length === 0) {
      functions.logger.info('onReportCreated: no parents linked', { childId });
      return null;
    }

    const prefKey = reportTypeToNotificationPrefKey(report.type);
    const eligibleParentIds = await getEligibleParentUserIds(db, parentIds, prefKey);
    const tokens = await getFcmTokensForParentUserIds(db, eligibleParentIds, prefKey);
    if (tokens.length === 0) {
      functions.logger.info('onReportCreated: no FCM tokens after prefs', { childId, prefKey });
      return null;
    }

    const childName = (child.name && String(child.name).trim()) || 'Your child';
    const { title, body } = buildReportNotificationCopy(report, childName);
    await createInAppNotificationsForUserIds(db, eligibleParentIds, {
      title,
      body,
      data: {
        type: 'daily_report',
        schoolId,
        childId,
        reportId,
        reportType: report.type ? String(report.type) : '',
      },
    });

    const msg: admin.messaging.MulticastMessage = {
      tokens,
      notification: {
        title: title.slice(0, 200),
        body: body.slice(0, 200),
      },
      data: {
        type: 'daily_report',
        schoolId,
        childId,
        reportId,
        reportType: report.type ? String(report.type) : '',
      },
      android: { priority: 'high' as const },
      apns: { payload: { aps: { sound: 'default', badge: 1 } } },
    };
    try {
      const res = await admin.messaging().sendEachForMulticast(msg);
      functions.logger.info('onReportCreated: sent', {
        success: res.successCount,
        failed: res.failureCount,
        schoolId,
        childId,
      });
    } catch (e) {
      functions.logger.error('onReportCreated: send failed', e);
    }
    return null;
  });
