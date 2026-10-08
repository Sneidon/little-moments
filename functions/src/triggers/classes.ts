import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { formatClassLabelForParentNotify, normalizeAssignedTeacherId } from '../lib/childClassChange';
import { createInAppNotificationsForUserIds, getFcmTokensForUserIds } from '../lib/notifications/recipients';
import { userHasRole } from '../lib/roles';

async function notifyTeacherOfClassAssignment(params: {
  db: admin.firestore.Firestore;
  schoolId: string;
  classId: string;
  teacherId: string;
  isReassignment: boolean;
}): Promise<void> {
  const { db, schoolId, classId, teacherId, isReassignment } = params;
  const teacherSnap = await db.collection('users').doc(teacherId).get();
  if (!teacherSnap.exists) return;
  const teacher = teacherSnap.data() as { role?: string; schoolId?: string; isActive?: boolean };
  if (teacher.isActive === false || !userHasRole(teacher, 'teacher') || teacher.schoolId !== schoolId) return;

  const classSnap = await db.collection('schools').doc(schoolId).collection('classes').doc(classId).get();
  const classLabel = classSnap.exists
    ? formatClassLabelForParentNotify(
        classSnap.data() as { name?: string; minAgeMonths?: number | null; maxAgeMonths?: number | null }
      )
    : 'a class';

  const title = isReassignment ? 'New class assignment' : 'Class assignment';
  const body = isReassignment
    ? `You have been assigned to ${classLabel}. Open the app to view your class.`
    : `You have been assigned to ${classLabel}. Open the app to get started.`;

  const data = { type: 'class_assigned', schoolId, classId };
  await createInAppNotificationsForUserIds(db, [teacherId], { title, body, data });

  const tokens = await getFcmTokensForUserIds(db, [teacherId], null);
  if (tokens.length === 0) {
    functions.logger.info('notifyTeacherOfClassAssignment: no FCM tokens', { teacherId, classId });
    return;
  }
  const msg: admin.messaging.MulticastMessage = {
    tokens,
    notification: { title: title.slice(0, 200), body: body.slice(0, 200) },
    data,
    android: { priority: 'high' as const },
    apns: { payload: { aps: { sound: 'default', badge: 1 } } },
  };
  try {
    const res = await admin.messaging().sendEachForMulticast(msg);
    functions.logger.info('notifyTeacherOfClassAssignment: sent', {
      teacherId,
      classId,
      success: res.successCount,
      failed: res.failureCount,
    });
  } catch (e) {
    functions.logger.error('notifyTeacherOfClassAssignment: send failed', { teacherId, classId, error: e });
  }
}

/** Push + in-app notification when a teacher is assigned to a class (create or update). */
export const onSchoolClassTeacherAssigned = functions.firestore
  .document('schools/{schoolId}/classes/{classId}')
  .onUpdate(async (change, context) => {
    const beforeId = normalizeAssignedTeacherId(
      (change.before.data() as { assignedTeacherId?: string | null }).assignedTeacherId
    );
    const afterId = normalizeAssignedTeacherId(
      (change.after.data() as { assignedTeacherId?: string | null }).assignedTeacherId
    );
    if (!afterId || beforeId === afterId) return null;
    const db = admin.firestore();
    try {
      await notifyTeacherOfClassAssignment({
        db,
        schoolId: context.params.schoolId,
        classId: context.params.classId,
        teacherId: afterId,
        isReassignment: beforeId != null,
      });
    } catch (e) {
      functions.logger.error('onSchoolClassTeacherAssigned failed', {
        schoolId: context.params.schoolId,
        classId: context.params.classId,
        error: e,
      });
    }
    return null;
  });

export const onSchoolClassCreatedWithTeacher = functions.firestore
  .document('schools/{schoolId}/classes/{classId}')
  .onCreate(async (snap, context) => {
    const teacherId = normalizeAssignedTeacherId(
      (snap.data() as { assignedTeacherId?: string | null }).assignedTeacherId
    );
    if (!teacherId) return null;
    const db = admin.firestore();
    try {
      await notifyTeacherOfClassAssignment({
        db,
        schoolId: context.params.schoolId,
        classId: context.params.classId,
        teacherId,
        isReassignment: false,
      });
    } catch (e) {
      functions.logger.error('onSchoolClassCreatedWithTeacher failed', {
        schoolId: context.params.schoolId,
        classId: context.params.classId,
        error: e,
      });
    }
    return null;
  });
