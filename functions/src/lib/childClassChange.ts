import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { createInAppNotificationsForUserIds, getFcmTokensForUserIds } from './notifications/recipients';
import { userHasRole } from './roles';
import { childEnrollmentIsActive, isoNow } from './util';

export function normalizeChildClassId(classId: string | null | undefined): string | null {
  if (classId == null || typeof classId !== 'string') return null;
  const t = classId.trim();
  return t.length > 0 ? t : null;
}

export function formatClassLabelForParentNotify(data: {
  name?: string;
  minAgeMonths?: number | null;
  maxAgeMonths?: number | null;
} | null): string {
  if (!data?.name || !String(data.name).trim()) return 'their new class';
  const name = String(data.name).trim();
  const min = data.minAgeMonths;
  const max = data.maxAgeMonths;
  const fmtMonths = (m: number) => (m >= 24 ? `${Math.round(m / 12)} yr` : `${m} mo`);
  if (min != null && max != null && !Number.isNaN(Number(min)) && !Number.isNaN(Number(max))) {
    return `${name} (${fmtMonths(Number(min))} – ${fmtMonths(Number(max))})`;
  }
  if (min != null && !Number.isNaN(Number(min))) return `${name} (from ${fmtMonths(Number(min))})`;
  if (max != null && !Number.isNaN(Number(max))) return `${name} (up to ${fmtMonths(Number(max))})`;
  return name;
}

async function fetchClassLabel(
  db: admin.firestore.Firestore,
  schoolId: string,
  classId: string | null
): Promise<string | null> {
  if (!classId) return null;
  const snap = await db.collection('schools').doc(schoolId).collection('classes').doc(classId).get();
  if (!snap.exists) return null;
  return formatClassLabelForParentNotify(snap.data() as { name?: string; minAgeMonths?: number | null; maxAgeMonths?: number | null });
}

export async function createClassChangeReportForChild(params: {
  db: admin.firestore.Firestore;
  schoolId: string;
  childId: string;
  beforeClassId: string | null;
  afterClassId: string;
}): Promise<void> {
  const { db, schoolId, childId, beforeClassId, afterClassId } = params;
  const childSnap = await db.collection('schools').doc(schoolId).collection('children').doc(childId).get();
  if (!childSnap.exists) return;
  const child = childSnap.data() as { isActive?: boolean; parentIds?: string[] };
  if (!childEnrollmentIsActive(child)) return;
  if (!child.parentIds?.length) return;

  const [beforeLabel, afterLabel] = await Promise.all([
    fetchClassLabel(db, schoolId, beforeClassId),
    fetchClassLabel(db, schoolId, afterClassId),
  ]);
  const newLabel = afterLabel || 'their new class';
  const notes =
    beforeClassId == null
      ? `Assigned to ${newLabel}.`
      : `Moved from ${beforeLabel || 'their previous class'} to ${newLabel}.`;

  const now = isoNow();
  await db
    .collection('schools')
    .doc(schoolId)
    .collection('children')
    .doc(childId)
    .collection('reports')
    .add({
      childId,
      schoolId,
      type: 'class_change',
      reportedBy: 'system',
      notes,
      timestamp: now,
      createdAt: now,
      previousClassId: beforeClassId ?? undefined,
      newClassId: afterClassId,
    });
}

export function normalizeAssignedTeacherId(teacherId: string | null | undefined): string | null {
  if (teacherId == null || typeof teacherId !== 'string') return null;
  const t = teacherId.trim();
  return t.length > 0 ? t : null;
}

export async function notifyTeacherChildJoinedClass(params: {
  db: admin.firestore.Firestore;
  schoolId: string;
  childId: string;
  beforeClassId: string | null;
  afterClassId: string;
}): Promise<void> {
  const { db, schoolId, childId, beforeClassId, afterClassId } = params;
  const childSnap = await db.collection('schools').doc(schoolId).collection('children').doc(childId).get();
  if (!childSnap.exists) return;
  const child = childSnap.data() as { name?: string; isActive?: boolean };
  if (!childEnrollmentIsActive(child)) return;

  const classSnap = await db.collection('schools').doc(schoolId).collection('classes').doc(afterClassId).get();
  if (!classSnap.exists) return;
  const classData = classSnap.data() as { assignedTeacherId?: string | null };
  const teacherId = normalizeAssignedTeacherId(classData.assignedTeacherId);
  if (!teacherId) return;

  const teacherSnap = await db.collection('users').doc(teacherId).get();
  if (!teacherSnap.exists) return;
  const teacher = teacherSnap.data() as { role?: string; schoolId?: string; isActive?: boolean };
  if (teacher.isActive === false || !userHasRole(teacher, 'teacher') || teacher.schoolId !== schoolId) return;

  const childName = (child.name && String(child.name).trim()) || 'A child';
  const [beforeLabel, afterLabel] = await Promise.all([
    fetchClassLabel(db, schoolId, beforeClassId),
    fetchClassLabel(db, schoolId, afterClassId),
  ]);
  const classLabel = afterLabel || 'your class';
  const notes =
    beforeClassId == null
      ? `${childName} has been added to ${classLabel}.`
      : `${childName} joined your class from ${beforeLabel || 'another class'}.`;

  const now = isoNow();
  const reportRef = await db
    .collection('schools')
    .doc(schoolId)
    .collection('children')
    .doc(childId)
    .collection('reports')
    .add({
      childId,
      schoolId,
      type: 'child_joined_class',
      reportedBy: 'system',
      notes,
      timestamp: now,
      createdAt: now,
      previousClassId: beforeClassId ?? undefined,
      newClassId: afterClassId,
    });

  const title = `${childName} joined your class`;
  const body = notes;
  const data = {
    type: 'child_joined_class',
    schoolId,
    childId,
    reportId: reportRef.id,
    classId: afterClassId,
  };
  await createInAppNotificationsForUserIds(db, [teacherId], { title, body, data });

  const tokens = await getFcmTokensForUserIds(db, [teacherId], null);
  if (tokens.length === 0) {
    functions.logger.info('notifyTeacherChildJoinedClass: no FCM tokens', { teacherId, childId });
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
    functions.logger.info('notifyTeacherChildJoinedClass: sent', {
      teacherId,
      childId,
      success: res.successCount,
      failed: res.failureCount,
    });
  } catch (e) {
    functions.logger.error('notifyTeacherChildJoinedClass: send failed', { teacherId, childId, error: e });
  }
}

/** Notify parents (report + push via onReportCreated) when class assignment changes. */
export async function handleChildClassAssignmentChange(
  db: admin.firestore.Firestore,
  schoolId: string,
  childId: string,
  before: { isActive?: boolean; classId?: string | null },
  after: { isActive?: boolean; classId?: string | null }
): Promise<void> {
  if (!childEnrollmentIsActive(after)) return;
  const beforeClassId = normalizeChildClassId(before.classId);
  const afterClassId = normalizeChildClassId(after.classId);
  if (!afterClassId || beforeClassId === afterClassId) return;
  await createClassChangeReportForChild({ db, schoolId, childId, beforeClassId, afterClassId });
  await notifyTeacherChildJoinedClass({ db, schoolId, childId, beforeClassId, afterClassId });
}
