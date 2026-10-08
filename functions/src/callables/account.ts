import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { AppUserRole, RoleProfileSlice, normalizeUserRoles } from '../lib/roles';
import { isoNow } from '../lib/util';

// Sync custom claims from the caller's Firestore user document to their Auth token.
// Call this after login so Firestore rules (which use request.auth.token.role) work.
export const syncClaims = functions.https.onCall(async (_data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be signed in.');
  }
  const uid = context.auth.uid;
  const db = admin.firestore();
  const ref = db.collection('users').doc(uid);
  const snap = await ref.get();
  if (!snap.exists) {
    return { ok: false, message: 'No user profile' };
  }
  const data = snap.data() as RoleProfileSlice & { schoolId?: string };
  const { roles, role } = normalizeUserRoles(data);
  if (roles.length && (!Array.isArray(data.roles) || data.roles.length === 0)) {
    await ref.set({ roles }, { merge: true });
  }
  const claims: Record<string, string> = {};
  if (role) claims.role = role;
  if (data.schoolId) claims.schoolId = data.schoolId;
  await admin.auth().setCustomUserClaims(uid, claims);
  return { ok: true, roles, role: role ?? null };
});

/** Switch the active portal role (must already be in the user's roles[]). */
export const selectActiveRole = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be signed in.');
  }
  const roleRaw = data?.role;
  if (!roleRaw || typeof roleRaw !== 'string') {
    throw new functions.https.HttpsError('invalid-argument', 'role is required.');
  }
  const role = roleRaw.trim() as AppUserRole;
  const allowed: AppUserRole[] = ['teacher', 'parent', 'principal', 'super_admin'];
  if (!allowed.includes(role)) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid role.');
  }

  const uid = context.auth.uid;
  const db = admin.firestore();
  const ref = db.collection('users').doc(uid);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new functions.https.HttpsError('not-found', 'No user profile.');
  }
  const profile = snap.data() as RoleProfileSlice & { schoolId?: string };
  const { roles } = normalizeUserRoles(profile);
  if (!roles.includes(role)) {
    throw new functions.https.HttpsError('permission-denied', 'You do not have this role.');
  }

  const now = isoNow();
  await ref.set({ role, roles, updatedAt: now }, { merge: true });

  const claims: Record<string, string> = { role };
  if (profile.schoolId) {
    claims.schoolId = profile.schoolId;
  }
  await admin.auth().setCustomUserClaims(uid, claims);
  return { ok: true, role, roles };
});

// Register FCM token for push notifications (announcements, reminders, etc.). Call from mobile after getting the token.
export const saveFcmToken = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be signed in.');
  }
  const token = data?.token && typeof data.token === 'string' ? data.token.trim() : null;
  if (!token) {
    throw new functions.https.HttpsError('invalid-argument', 'token is required.');
  }
  const uid = context.auth.uid;
  const db = admin.firestore();
  const userRef = db.collection('users').doc(uid);
  const snap = await userRef.get();
  if (!snap.exists) {
    throw new functions.https.HttpsError('failed-precondition', 'No user profile.');
  }
  const current = (snap.data() as { fcmTokens?: string[] }).fcmTokens || [];
  if (current.includes(token)) return { ok: true };
  const updated = [...current, token].slice(-20); // keep last 20 tokens per user
  await userRef.update({ fcmTokens: updated, updatedAt: new Date().toISOString() });
  return { ok: true };
});
