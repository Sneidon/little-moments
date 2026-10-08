import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { ParentNotificationPrefKey } from '../lib/notifications/recipients';
import { RoleProfileSlice, userHasRole } from '../lib/roles';

// Parent updates their child's profile (name, DOB, allergies, photoURL). Only allowed fields.
export const updateChildProfileByParent = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Must be signed in.');
  const uid = context.auth.uid;
  const db = admin.firestore();
  const { schoolId, childId, name, dateOfBirth, allergies, photoURL } = data as {
    schoolId?: string;
    childId?: string;
    name?: string;
    dateOfBirth?: string;
    allergies?: string[];
    photoURL?: string;
  };
  if (!schoolId || !childId) throw new functions.https.HttpsError('invalid-argument', 'schoolId and childId required.');
  const childRef = db.collection('schools').doc(schoolId).collection('children').doc(childId);
  const childSnap = await childRef.get();
  if (!childSnap.exists) throw new functions.https.HttpsError('not-found', 'Child not found.');
  const child = childSnap.data() as { parentIds?: string[] };
  if (!child.parentIds?.includes(uid)) throw new functions.https.HttpsError('permission-denied', 'Not a parent of this child.');
  const now = new Date().toISOString();
  const updates: Record<string, unknown> = { updatedAt: now };
  if (name !== undefined && typeof name === 'string' && name.trim()) updates.name = name.trim();
  if (dateOfBirth !== undefined && typeof dateOfBirth === 'string') updates.dateOfBirth = dateOfBirth;
  if (allergies !== undefined && Array.isArray(allergies)) updates.allergies = allergies.filter((a: unknown) => typeof a === 'string' && a.trim());
  if (photoURL !== undefined) updates.photoURL = typeof photoURL === 'string' && photoURL.trim() ? photoURL.trim() : null;
  await childRef.update(updates);
  return { ok: true };
});

// Teacher updates child's profile (name, DOB, allergies, photoURL) for children in their class.
export const updateChildProfileByTeacher = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Must be signed in.');
  const uid = context.auth.uid;
  const db = admin.firestore();
  const callerSnap = await db.collection('users').doc(uid).get();
  const callerData = callerSnap.exists ? (callerSnap.data() as { role?: string; schoolId?: string }) : null;
  if (!userHasRole(callerData, 'teacher') || callerData?.schoolId === undefined) {
    throw new functions.https.HttpsError('permission-denied', 'Only teachers can use this.');
  }
  const { schoolId, childId, name, dateOfBirth, allergies, photoURL } = data as {
    schoolId?: string;
    childId?: string;
    name?: string;
    dateOfBirth?: string;
    allergies?: string[];
    photoURL?: string;
  };
  if (!schoolId || schoolId !== callerData.schoolId || !childId) {
    throw new functions.https.HttpsError('invalid-argument', 'schoolId and childId required.');
  }
  const childRef = db.collection('schools').doc(schoolId).collection('children').doc(childId);
  const childSnap = await childRef.get();
  if (!childSnap.exists) throw new functions.https.HttpsError('not-found', 'Child not found.');
  const child = childSnap.data() as { classId?: string };
  const classSnap = child.classId ? await db.collection('schools').doc(schoolId).collection('classes').doc(child.classId).get() : null;
  const assignedTeacherId = classSnap?.exists ? (classSnap.data() as { assignedTeacherId?: string }).assignedTeacherId : null;
  if (assignedTeacherId !== uid) throw new functions.https.HttpsError('permission-denied', 'Not the teacher for this child.');
  const now = new Date().toISOString();
  const updates: Record<string, unknown> = { updatedAt: now };
  if (name !== undefined && typeof name === 'string' && name.trim()) updates.name = name.trim();
  if (dateOfBirth !== undefined && typeof dateOfBirth === 'string') updates.dateOfBirth = dateOfBirth;
  if (allergies !== undefined && Array.isArray(allergies)) updates.allergies = allergies.filter((a: unknown) => typeof a === 'string' && a.trim());
  if (photoURL !== undefined) updates.photoURL = typeof photoURL === 'string' && photoURL.trim() ? photoURL.trim() : null;
  await childRef.update(updates);
  return { ok: true };
});

// Parent updates their own profile (name, lastName, email, phone, photoURL, notificationPreferences).
export const updateParentProfile = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Must be signed in.');
  const uid = context.auth.uid;
  const db = admin.firestore();
  const userRef = db.collection('users').doc(uid);
  const snap = await userRef.get();
  if (!snap.exists) throw new functions.https.HttpsError('not-found', 'User not found.');
  const d = snap.data() as { role?: string };
  if (d.role !== 'parent') throw new functions.https.HttpsError('permission-denied', 'Only parents can use this.');
  const { displayName, lastName, phone, photoURL, notificationPreferences } = data as {
    displayName?: string;
    lastName?: string;
    phone?: string;
    photoURL?: string;
    notificationPreferences?: Record<string, boolean>;
  };
  const now = new Date().toISOString();
  const updates: Record<string, unknown> = { updatedAt: now };
  if (displayName !== undefined && typeof displayName === 'string') updates.displayName = displayName.trim();
  if (lastName !== undefined) updates.lastName = typeof lastName === 'string' && lastName.trim() ? lastName.trim() : null;
  if (phone !== undefined) updates.phone = typeof phone === 'string' && phone.trim() ? phone.trim() : null;
  if (photoURL !== undefined) updates.photoURL = typeof photoURL === 'string' && photoURL.trim() ? photoURL.trim() : null;
  if (notificationPreferences !== undefined && typeof notificationPreferences === 'object') {
    updates.notificationPreferences = notificationPreferences;
  }
  await userRef.update(updates);
  return { ok: true };
});

// Teacher updates push toggles (merged into notificationPreferences).
export const updateTeacherNotificationPreferences = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Must be signed in.');
  const uid = context.auth.uid;
  const db = admin.firestore();
  const userRef = db.collection('users').doc(uid);
  const snap = await userRef.get();
  if (!snap.exists) throw new functions.https.HttpsError('not-found', 'User not found.');
  const d = snap.data() as RoleProfileSlice & { notificationPreferences?: Record<string, boolean> };
  if (!userHasRole(d, 'teacher')) {
    throw new functions.https.HttpsError('permission-denied', 'Only teachers can use this.');
  }
  const { notificationPreferences } = data as { notificationPreferences?: Record<string, boolean> };
  if (!notificationPreferences || typeof notificationPreferences !== 'object') {
    throw new functions.https.HttpsError('invalid-argument', 'notificationPreferences is required.');
  }
  const allowed: ParentNotificationPrefKey[] = ['messages', 'announcements', 'checkIn', 'checkOut'];
  const merged: Record<string, boolean> = { ...(d.notificationPreferences || {}) };
  for (const key of allowed) {
    if (key in notificationPreferences) merged[key] = Boolean(notificationPreferences[key]);
  }
  await userRef.update({
    notificationPreferences: merged,
    updatedAt: new Date().toISOString(),
  });
  return { ok: true };
});
