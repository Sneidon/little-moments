import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { childEnrollmentIsActive, isoNow } from '../lib/util';

export const recordParentFirstLogin = functions.https.onCall(async (_data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Must be signed in.');
  const uid = context.auth.uid;
  const db = admin.firestore();
  const snap = await db.collection('users').doc(uid).get();
  if (!snap.exists) throw new functions.https.HttpsError('not-found', 'User not found.');
  const d = snap.data() as { role?: string; parentStatus?: string; firstLoginAt?: string };
  if (d.role !== 'parent') throw new functions.https.HttpsError('permission-denied', 'Only parents can use this.');
  if (d.parentStatus !== 'ACTIVE') throw new functions.https.HttpsError('permission-denied', 'Parent not active.');
  if (d.firstLoginAt) return { ok: true, firstLoginAt: d.firstLoginAt };
  const now = isoNow();
  await db.collection('users').doc(uid).update({ firstLoginAt: now, updatedAt: now });
  return { ok: true, firstLoginAt: now };
});

export const completeParentOnboardingTour = functions.https.onCall(async (_data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Must be signed in.');
  const uid = context.auth.uid;
  const db = admin.firestore();
  const snap = await db.collection('users').doc(uid).get();
  if (!snap.exists) throw new functions.https.HttpsError('not-found', 'User not found.');
  const d = snap.data() as { role?: string; parentStatus?: string };
  if (d.role !== 'parent') throw new functions.https.HttpsError('permission-denied', 'Only parents can use this.');
  if (d.parentStatus !== 'ACTIVE') throw new functions.https.HttpsError('permission-denied', 'Parent not active.');
  const now = isoNow();
  await db.collection('users').doc(uid).set({ onboardingTourCompletedAt: now, updatedAt: now }, { merge: true });
  return { ok: true };
});

// Returns 5 latest photo/moment updates for a parent's children (for post-approval activation).
export const getParentHomeBootstrap = functions.https.onCall(async (_data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Must be signed in.');
  const uid = context.auth.uid;
  const db = admin.firestore();
  const userSnap = await db.collection('users').doc(uid).get();
  if (!userSnap.exists) throw new functions.https.HttpsError('not-found', 'User not found.');
  const user = userSnap.data() as { role?: string; parentStatus?: string; schoolId?: string };
  if (user.role !== 'parent') throw new functions.https.HttpsError('permission-denied', 'Only parents can use this.');
  if (user.parentStatus !== 'ACTIVE') throw new functions.https.HttpsError('permission-denied', 'Parent not active.');
  const schoolId = user.schoolId;
  if (!schoolId) return { ok: true, moments: [] };

  const childrenSnap = await db
    .collection('schools')
    .doc(schoolId)
    .collection('children')
    .where('parentIds', 'array-contains', uid)
    .get();
  const childIds = childrenSnap.docs
    .filter((d) => childEnrollmentIsActive(d.data() as { isActive?: boolean }))
    .map((d) => d.id)
    .slice(0, 10);
  const moments: Array<{ childId: string; reportId: string; timestamp: string; imageUrl?: string; type?: string }> = [];
  for (const childId of childIds) {
    const repSnap = await db
      .collection('schools')
      .doc(schoolId)
      .collection('children')
      .doc(childId)
      .collection('reports')
      .orderBy('timestamp', 'desc')
      .limit(5)
      .get();
    repSnap.docs.forEach((d) => {
      const r = d.data() as { timestamp?: string; imageUrl?: string; type?: string };
      if (r.timestamp) moments.push({ childId, reportId: d.id, timestamp: String(r.timestamp), imageUrl: r.imageUrl, type: r.type });
    });
  }
  moments.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
  return { ok: true, moments: moments.slice(0, 5) };
});

// Sibling registration: active parent adds another child (creates a new pending approval request).
export const addSiblingChild = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Must be signed in.');
  const uid = context.auth.uid;
  const db = admin.firestore();
  const userSnap = await db.collection('users').doc(uid).get();
  if (!userSnap.exists) throw new functions.https.HttpsError('not-found', 'User not found.');
  const user = userSnap.data() as { role?: string; parentStatus?: string; schoolId?: string; displayName?: string; email?: string };
  if (user.role !== 'parent') throw new functions.https.HttpsError('permission-denied', 'Only parents can add children.');
  if (user.parentStatus !== 'ACTIVE') throw new functions.https.HttpsError('permission-denied', 'Parent not active.');
  if (!user.schoolId) throw new functions.https.HttpsError('failed-precondition', 'Missing schoolId.');
  const schoolId = user.schoolId;

  const { childFirstName, childSurname, dob, classId, popiaConsent } = data as {
    childFirstName?: string;
    childSurname?: string;
    dob?: string;
    classId?: string;
    popiaConsent?: boolean;
  };
  if (!childFirstName || !childSurname || !dob || !classId) {
    throw new functions.https.HttpsError('invalid-argument', 'childFirstName, childSurname, dob, classId are required.');
  }
  if (popiaConsent !== true) throw new functions.https.HttpsError('invalid-argument', 'POPIA consent is required.');

  const classSnap = await db.collection('schools').doc(schoolId).collection('classes').doc(String(classId)).get();
  if (!classSnap.exists) throw new functions.https.HttpsError('invalid-argument', 'Invalid class.');
  const classData = classSnap.data() as { assignedTeacherId?: string; name?: string };
  const teacherId = classData.assignedTeacherId || null;

  const now = isoNow();
  const childName = `${String(childFirstName).trim()} ${String(childSurname).trim()}`.trim();
  const childRef = db.collection('schools').doc(schoolId).collection('children').doc();
  const regRef = db.collection('schools').doc(schoolId).collection('pendingRegistrations').doc();

  const batch = db.batch();
  batch.set(childRef, {
    schoolId,
    name: childName || 'Child',
    dateOfBirth: String(dob),
    classId: String(classId),
    assignedTeacherId: teacherId || undefined,
    parentIds: [uid],
    popiaConsent: true,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  });
  batch.set(regRef, {
    id: regRef.id,
    schoolId,
    classId: String(classId),
    teacherId,
    parentUid: uid,
    childId: childRef.id,
    qrCodeId: null,
    status: 'PENDING',
    createdAt: now,
    createdVia: 'sibling',
  });
  await batch.commit();

  if (teacherId) {
    await db.collection('users').doc(teacherId).collection('notifications').doc().set({
      title: 'New registration',
      body: `${user.displayName || 'Parent'} → ${childName} (${classData.name || 'Class'})`,
      createdAt: now,
      read: false,
      type: 'pending_registration',
      schoolId,
      registrationId: regRef.id,
      parentUid: uid,
      childId: childRef.id,
      classId: String(classId),
    });
  }
  return { ok: true, childId: childRef.id, registrationId: regRef.id };
});

export const recordFirstPhotoViewed = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Must be signed in.');
  const uid = context.auth.uid;
  const { schoolId, childId, reportId } = data as { schoolId?: string; childId?: string; reportId?: string };
  if (!schoolId || !childId || !reportId) {
    throw new functions.https.HttpsError('invalid-argument', 'schoolId, childId, reportId are required.');
  }
  const db = admin.firestore();
  const userRef = db.collection('users').doc(uid);
  const userSnap = await userRef.get();
  if (!userSnap.exists) throw new functions.https.HttpsError('not-found', 'User not found.');
  const user = userSnap.data() as { role?: string; parentStatus?: string; firstPhotoViewedAt?: string };
  if (user.role !== 'parent') throw new functions.https.HttpsError('permission-denied', 'Only parents can use this.');
  if (user.parentStatus !== 'ACTIVE') throw new functions.https.HttpsError('permission-denied', 'Parent not active.');
  if (user.firstPhotoViewedAt) return { ok: true, firstPhotoViewedAt: user.firstPhotoViewedAt };
  const now = isoNow();
  await userRef.set({ firstPhotoViewedAt: now, updatedAt: now }, { merge: true });
  await db.collection('analyticsEvents').doc().set({
    type: 'first_photo_viewed',
    createdAt: now,
    schoolId: String(schoolId),
    userId: uid,
    props: { childId: String(childId), reportId: String(reportId) },
  });
  return { ok: true, firstPhotoViewedAt: now };
});
