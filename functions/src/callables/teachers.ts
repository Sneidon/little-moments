import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { RoleProfileSlice, userHasRole } from '../lib/roles';

// Create a teacher for the principal's school. Callable by principal only.
// Creates Auth user + users/{uid} profile with role=teacher, schoolId=principal's schoolId.
export const createTeacher = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be signed in.');
  }
  const callerUid = context.auth.uid;
  const db = admin.firestore();
  const callerSnap = await db.collection('users').doc(callerUid).get();
  const callerData = callerSnap.exists ? (callerSnap.data() as { role?: string; schoolId?: string }) : null;
  if (!userHasRole(callerData, 'principal') || !callerData?.schoolId) {
    throw new functions.https.HttpsError('permission-denied', 'Only principals can add teachers to their school.');
  }
  const schoolId = callerData.schoolId;

  const { teacherEmail, teacherDisplayName, teacherPreferredName, teacherPassword } = data as {
    teacherEmail?: string;
    teacherDisplayName?: string;
    teacherPreferredName?: string;
    teacherPassword?: string;
  };

  if (!teacherEmail || typeof teacherEmail !== 'string' || !teacherEmail.trim()) {
    throw new functions.https.HttpsError('invalid-argument', 'Teacher email is required.');
  }
  if (!teacherPassword || typeof teacherPassword !== 'string' || teacherPassword.length < 6) {
    throw new functions.https.HttpsError('invalid-argument', 'Teacher password must be at least 6 characters.');
  }

  const now = new Date().toISOString();

  const userRecord = await admin.auth().createUser({
    email: teacherEmail.trim(),
    password: teacherPassword,
    displayName: (teacherDisplayName && typeof teacherDisplayName === 'string')
      ? teacherDisplayName.trim()
      : teacherEmail.trim(),
  });
  const teacherUid = userRecord.uid;

  const displayName = (teacherDisplayName && typeof teacherDisplayName === 'string')
    ? teacherDisplayName.trim()
    : teacherEmail.trim();
  const preferredName = (teacherPreferredName && typeof teacherPreferredName === 'string')
    ? teacherPreferredName.trim()
    : null;
  await db.collection('users').doc(teacherUid).set({
    email: teacherEmail.trim(),
    displayName,
    ...(preferredName ? { preferredName } : {}),
    role: 'teacher',
    roles: ['teacher'],
    schoolId,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  });

  return { teacherUid };
});

// Update a teacher's name or active status. Callable by principal only (for teachers in their school).
export const updateTeacher = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be signed in.');
  }
  const callerUid = context.auth.uid;
  const db = admin.firestore();
  const callerSnap = await db.collection('users').doc(callerUid).get();
  const callerData = callerSnap.exists ? (callerSnap.data() as { role?: string; schoolId?: string }) : null;
  if (!userHasRole(callerData, 'principal') || !callerData?.schoolId) {
    throw new functions.https.HttpsError('permission-denied', 'Only principals can update teachers.');
  }
  const schoolId = callerData.schoolId;

  const { teacherUid, displayName, preferredName, isActive } = data as {
    teacherUid?: string;
    displayName?: string;
    preferredName?: string;
    isActive?: boolean;
  };

  if (!teacherUid || typeof teacherUid !== 'string' || !teacherUid.trim()) {
    throw new functions.https.HttpsError('invalid-argument', 'Teacher UID is required.');
  }

  const teacherRef = db.collection('users').doc(teacherUid);
  const teacherSnap = await teacherRef.get();
  if (!teacherSnap.exists) {
    throw new functions.https.HttpsError('not-found', 'Teacher not found.');
  }
  const teacherData = teacherSnap.data() as RoleProfileSlice;
  if (!userHasRole(teacherData, 'teacher') || teacherData.schoolId !== schoolId) {
    throw new functions.https.HttpsError('permission-denied', 'Can only update teachers in your school.');
  }

  const now = new Date().toISOString();
  const updates: Record<string, unknown> = { updatedAt: now };
  if (displayName !== undefined && typeof displayName === 'string' && displayName.trim()) {
    updates.displayName = displayName.trim();
  }
  if (preferredName !== undefined) {
    updates.preferredName = typeof preferredName === 'string' && preferredName.trim() ? preferredName.trim() : null;
  }
  if (isActive !== undefined) updates.isActive = Boolean(isActive);

  await teacherRef.update(updates);
  return { ok: true };
});

/** Remove a teacher from the school: unassign all classes & children, delete Auth + users doc. Principal only. */
export const principalDeleteTeacher = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be signed in.');
  }
  const callerUid = context.auth.uid;
  const db = admin.firestore();
  const callerSnap = await db.collection('users').doc(callerUid).get();
  const callerData = callerSnap.exists ? (callerSnap.data() as { role?: string; schoolId?: string }) : null;
  if (!userHasRole(callerData, 'principal') || !callerData?.schoolId) {
    throw new functions.https.HttpsError('permission-denied', 'Only principals can delete teachers from their school.');
  }
  const schoolId = callerData.schoolId;

  const { teacherUid } = data as { teacherUid?: string };
  if (!teacherUid || typeof teacherUid !== 'string' || !teacherUid.trim()) {
    throw new functions.https.HttpsError('invalid-argument', 'Teacher UID is required.');
  }
  const targetUid = teacherUid.trim();

  const teacherRef = db.collection('users').doc(targetUid);
  const teacherSnap = await teacherRef.get();
  if (!teacherSnap.exists) {
    throw new functions.https.HttpsError('not-found', 'Teacher not found.');
  }
  const teacherData = teacherSnap.data() as RoleProfileSlice;
  if (!userHasRole(teacherData, 'teacher') || teacherData.schoolId !== schoolId) {
    throw new functions.https.HttpsError('permission-denied', 'You can only delete teachers in your school.');
  }

  const del = admin.firestore.FieldValue.delete();
  const batchSize = 400;

  const [classesSnap, childrenSnap] = await Promise.all([
    db.collection('schools').doc(schoolId).collection('classes').where('assignedTeacherId', '==', targetUid).get(),
    db.collection('schools').doc(schoolId).collection('children').where('assignedTeacherId', '==', targetUid).get(),
  ]);

  const refsToClear = [...classesSnap.docs.map((d) => d.ref), ...childrenSnap.docs.map((d) => d.ref)];
  for (let i = 0; i < refsToClear.length; i += batchSize) {
    const slice = refsToClear.slice(i, i + batchSize);
    const batch = db.batch();
    for (const ref of slice) {
      batch.update(ref, { assignedTeacherId: del });
    }
    await batch.commit();
  }

  try {
    await admin.auth().deleteUser(targetUid);
  } catch (e: unknown) {
    const code =
      typeof e === 'object' && e !== null && 'code' in e ? String((e as { code: string }).code) : '';
    if (code === 'auth/user-not-found') {
      functions.logger.warn('principalDeleteTeacher: auth user missing, deleting Firestore profile only', {
        targetUid,
      });
    } else {
      functions.logger.error('principalDeleteTeacher: auth delete failed', e);
      const msg =
        typeof e === 'object' &&
        e !== null &&
        'message' in e &&
        typeof (e as { message: unknown }).message === 'string'
          ? String((e as { message: string }).message)
          : 'Failed to delete user';
      throw new functions.https.HttpsError('internal', msg);
    }
  }

  await teacherRef.delete();
  return {
    ok: true as const,
    unassignedClassCount: classesSnap.size,
    unassignedChildCount: childrenSnap.size,
  };
});
