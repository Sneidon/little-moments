import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { RoleProfileSlice, userHasRole } from '../lib/roles';

// Create a super admin. Callable by super_admin only.
export const createSuperAdmin = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be signed in.');
  }
  const callerUid = context.auth.uid;
  const db = admin.firestore();
  const callerSnap = await db.collection('users').doc(callerUid).get();
  const callerData = callerSnap.exists ? (callerSnap.data() as RoleProfileSlice) : null;
  if (!userHasRole(callerData, 'super_admin')) {
    throw new functions.https.HttpsError('permission-denied', 'Only super admins can add super admins.');
  }

  const { email, displayName, password } = data as {
    email?: string;
    displayName?: string;
    password?: string;
  };

  if (!email || typeof email !== 'string' || !email.trim()) {
    throw new functions.https.HttpsError('invalid-argument', 'Email is required.');
  }
  if (!password || typeof password !== 'string' || password.length < 6) {
    throw new functions.https.HttpsError('invalid-argument', 'Password must be at least 6 characters.');
  }

  const now = new Date().toISOString();
  const userRecord = await admin.auth().createUser({
    email: email.trim(),
    password,
    displayName: (displayName && typeof displayName === 'string') ? displayName.trim() : email.trim(),
  });
  await db.collection('users').doc(userRecord.uid).set({
    email: email.trim(),
    displayName: (displayName && typeof displayName === 'string') ? displayName.trim() : email.trim(),
    role: 'super_admin',
    roles: ['super_admin'],
    isActive: true,
    createdAt: now,
    updatedAt: now,
  });
  return { superAdminUid: userRecord.uid };
});

/** Revoke super admin: delete Auth user and users/{uid}. Callable by super_admin only. */
export const removeSuperAdmin = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be signed in.');
  }
  const callerUid = context.auth.uid;
  const db = admin.firestore();
  const callerSnap = await db.collection('users').doc(callerUid).get();
  const callerData = callerSnap.exists ? (callerSnap.data() as RoleProfileSlice) : null;
  if (!userHasRole(callerData, 'super_admin')) {
    throw new functions.https.HttpsError('permission-denied', 'Only super admins can remove super admins.');
  }

  const { superAdminUid } = data as { superAdminUid?: string };
  if (!superAdminUid || typeof superAdminUid !== 'string' || !superAdminUid.trim()) {
    throw new functions.https.HttpsError('invalid-argument', 'User ID is required.');
  }
  const targetUid = superAdminUid.trim();

  if (targetUid === callerUid) {
    throw new functions.https.HttpsError('permission-denied', 'You cannot remove your own administrator account.');
  }

  const targetRef = db.collection('users').doc(targetUid);
  const targetSnap = await targetRef.get();
  if (!targetSnap.exists) {
    throw new functions.https.HttpsError('not-found', 'User not found.');
  }
  const targetData = targetSnap.data() as RoleProfileSlice;
  if (!userHasRole(targetData, 'super_admin')) {
    throw new functions.https.HttpsError('invalid-argument', 'That user is not a super administrator.');
  }

  const [byActiveRole, byRoles] = await Promise.all([
    db.collection('users').where('role', '==', 'super_admin').get(),
    db.collection('users').where('roles', 'array-contains', 'super_admin').get(),
  ]);
  const adminUids = new Set<string>([
    ...byActiveRole.docs.map((d) => d.id),
    ...byRoles.docs.map((d) => d.id),
  ]);
  if (adminUids.size < 2) {
    throw new functions.https.HttpsError('failed-precondition', 'Cannot remove the last super administrator.');
  }

  try {
    await admin.auth().deleteUser(targetUid);
  } catch (e: unknown) {
    const code =
      typeof e === 'object' && e !== null && 'code' in e ? String((e as { code: string }).code) : '';
    if (code === 'auth/user-not-found') {
      functions.logger.warn('removeSuperAdmin: auth user missing, deleting Firestore only', { targetUid });
    } else {
      functions.logger.error('removeSuperAdmin: auth delete failed', e);
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
  await targetRef.delete();
  return { ok: true };
});
