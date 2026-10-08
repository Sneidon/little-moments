import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { userHasRole } from '../lib/roles';
import { isoNow } from '../lib/util';

// Update a parent's name, phone, or active status. Callable by principal only (for parents in their school).
export const updateParent = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be signed in.');
  }
  const callerUid = context.auth.uid;
  const db = admin.firestore();
  const callerSnap = await db.collection('users').doc(callerUid).get();
  const callerData = callerSnap.exists ? (callerSnap.data() as { role?: string; schoolId?: string }) : null;
  if (!userHasRole(callerData, 'principal') || !callerData?.schoolId) {
    throw new functions.https.HttpsError('permission-denied', 'Only principals can update parents.');
  }
  const schoolId = callerData.schoolId;

  const { parentUid, displayName, phone, isActive } = data as {
    parentUid?: string;
    displayName?: string;
    phone?: string;
    isActive?: boolean;
  };

  if (!parentUid || typeof parentUid !== 'string' || !parentUid.trim()) {
    throw new functions.https.HttpsError('invalid-argument', 'Parent UID is required.');
  }

  const parentRef = db.collection('users').doc(parentUid);
  const parentSnap = await parentRef.get();
  if (!parentSnap.exists) {
    throw new functions.https.HttpsError('not-found', 'Parent not found.');
  }
  const parentData = parentSnap.data() as { role?: string; schoolId?: string };
  if (parentData.role !== 'parent' || parentData.schoolId !== schoolId) {
    throw new functions.https.HttpsError('permission-denied', 'Can only update parents in your school.');
  }

  const now = new Date().toISOString();
  const updates: Record<string, unknown> = { updatedAt: now };
  if (displayName !== undefined && typeof displayName === 'string' && displayName.trim()) {
    updates.displayName = displayName.trim();
  }
  if (phone !== undefined) {
    updates.phone = typeof phone === 'string' && phone.trim() ? phone.trim() : null;
  }
  if (isActive !== undefined) updates.isActive = Boolean(isActive);

  await parentRef.update(updates);
  return { ok: true };
});

async function deleteParentAuthAndProfile(db: admin.firestore.Firestore, parentUid: string): Promise<void> {
  try {
    await admin.auth().deleteUser(parentUid);
  } catch (e: unknown) {
    const code =
      typeof e === 'object' && e !== null && 'code' in e ? String((e as { code: string }).code) : '';
    if (code === 'auth/user-not-found') {
      functions.logger.warn('deleteParentAuthAndProfile: auth user missing, deleting Firestore only', { parentUid });
    } else {
      functions.logger.error('deleteParentAuthAndProfile: auth delete failed', e);
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
  await db.collection('users').doc(parentUid).delete();
}

/** Remove parent from one child. If they are not on any other child at this school, delete their account. */
export const principalRemoveParentFromChild = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be signed in.');
  }
  const callerUid = context.auth.uid;
  const db = admin.firestore();
  const callerSnap = await db.collection('users').doc(callerUid).get();
  const callerData = callerSnap.exists ? (callerSnap.data() as { role?: string; schoolId?: string }) : null;
  if (!userHasRole(callerData, 'principal') || !callerData?.schoolId) {
    throw new functions.https.HttpsError('permission-denied', 'Only principals can remove parents.');
  }
  const schoolId = callerData.schoolId;

  const { childId, parentUid } = data as { childId?: string; parentUid?: string };
  if (!childId || typeof childId !== 'string' || !childId.trim()) {
    throw new functions.https.HttpsError('invalid-argument', 'Child ID is required.');
  }
  if (!parentUid || typeof parentUid !== 'string' || !parentUid.trim()) {
    throw new functions.https.HttpsError('invalid-argument', 'Parent UID is required.');
  }
  const cid = childId.trim();
  const puid = parentUid.trim();

  const parentRef = db.collection('users').doc(puid);
  const parentSnap = await parentRef.get();
  if (!parentSnap.exists) {
    throw new functions.https.HttpsError('not-found', 'Parent not found.');
  }
  const parentProfile = parentSnap.data() as { role?: string; schoolId?: string };
  if (parentProfile.role !== 'parent' || parentProfile.schoolId !== schoolId) {
    throw new functions.https.HttpsError('permission-denied', 'Can only remove parents in your school.');
  }

  const childRef = db.collection('schools').doc(schoolId).collection('children').doc(cid);
  const childSnap = await childRef.get();
  if (!childSnap.exists) {
    throw new functions.https.HttpsError('not-found', 'Child not found.');
  }
  const parentIdsOnChild = (childSnap.data() as { parentIds?: string[] }).parentIds ?? [];
  if (!parentIdsOnChild.includes(puid)) {
    throw new functions.https.HttpsError(
      'failed-precondition',
      'This parent is not linked to this child.'
    );
  }

  const now = isoNow();
  await childRef.update({
    parentIds: admin.firestore.FieldValue.arrayRemove(puid),
    updatedAt: now,
  });

  const stillLinked = await db
    .collection('schools')
    .doc(schoolId)
    .collection('children')
    .where('parentIds', 'array-contains', puid)
    .limit(1)
    .get();

  if (!stillLinked.empty) {
    return { ok: true as const, deletedAccount: false };
  }

  await deleteParentAuthAndProfile(db, puid);
  return { ok: true as const, deletedAccount: true };
});

/** Unlink parent from every child at the school and delete their account. Callable by principal only. */
export const principalDeleteParent = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be signed in.');
  }
  const callerUid = context.auth.uid;
  const db = admin.firestore();
  const callerSnap = await db.collection('users').doc(callerUid).get();
  const callerData = callerSnap.exists ? (callerSnap.data() as { role?: string; schoolId?: string }) : null;
  if (!userHasRole(callerData, 'principal') || !callerData?.schoolId) {
    throw new functions.https.HttpsError('permission-denied', 'Only principals can delete parents.');
  }
  const schoolId = callerData.schoolId;

  const { parentUid } = data as { parentUid?: string };
  if (!parentUid || typeof parentUid !== 'string' || !parentUid.trim()) {
    throw new functions.https.HttpsError('invalid-argument', 'Parent UID is required.');
  }
  const puid = parentUid.trim();

  const parentRef = db.collection('users').doc(puid);
  const parentSnap = await parentRef.get();
  if (!parentSnap.exists) {
    throw new functions.https.HttpsError('not-found', 'Parent not found.');
  }
  const parentProfile = parentSnap.data() as { role?: string; schoolId?: string };
  if (parentProfile.role !== 'parent' || parentProfile.schoolId !== schoolId) {
    throw new functions.https.HttpsError('permission-denied', 'Can only delete parents in your school.');
  }

  const linkedSnap = await db
    .collection('schools')
    .doc(schoolId)
    .collection('children')
    .where('parentIds', 'array-contains', puid)
    .get();

  const now = isoNow();
  const batchCap = 400;
  let batch = db.batch();
  let ops = 0;
  for (const d of linkedSnap.docs) {
    batch.update(d.ref, {
      parentIds: admin.firestore.FieldValue.arrayRemove(puid),
      updatedAt: now,
    });
    ops++;
    if (ops >= batchCap) {
      await batch.commit();
      batch = db.batch();
      ops = 0;
    }
  }
  if (ops > 0) {
    await batch.commit();
  }

  await deleteParentAuthAndProfile(db, puid);
  return { ok: true as const, unlinkedFromChildCount: linkedSnap.size };
});
