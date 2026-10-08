import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { requireCallerProfile } from '../lib/auth';
import { RoleProfileSlice, userHasRole } from '../lib/roles';
import { isoNow } from '../lib/util';

// Create a school and a principal user in one step (direct add, no invitation).
// Callable by super_admin only. Creates: Auth user (principal), school doc, users/{uid} profile.
// setUserClaims trigger will set custom claims for the new principal.
export const createSchoolWithPrincipal = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be signed in.');
  }
  const callerUid = context.auth.uid;
  const db = admin.firestore();
  const callerSnap = await db.collection('users').doc(callerUid).get();
  const callerProfile = callerSnap.exists ? (callerSnap.data() as RoleProfileSlice) : null;
  if (!userHasRole(callerProfile, 'super_admin')) {
    throw new functions.https.HttpsError('permission-denied', 'Only super admins can create schools.');
  }

  const {
    name,
    address,
    contactEmail,
    contactPhone,
    description,
    website,
    principalEmail,
    principalDisplayName,
    principalPassword,
  } = data as {
    name?: string;
    address?: string;
    contactEmail?: string;
    contactPhone?: string;
    description?: string;
    website?: string;
    principalEmail?: string;
    principalDisplayName?: string;
    principalPassword?: string;
  };

  if (!name || typeof name !== 'string' || !name.trim()) {
    throw new functions.https.HttpsError('invalid-argument', 'School name is required.');
  }
  if (!principalEmail || typeof principalEmail !== 'string' || !principalEmail.trim()) {
    throw new functions.https.HttpsError('invalid-argument', 'Principal email is required.');
  }
  if (!principalPassword || typeof principalPassword !== 'string' || principalPassword.length < 6) {
    throw new functions.https.HttpsError('invalid-argument', 'Principal password must be at least 6 characters.');
  }

  const now = new Date().toISOString();

  const userRecord = await admin.auth().createUser({
    email: principalEmail.trim(),
    password: principalPassword,
    displayName: (principalDisplayName && typeof principalDisplayName === 'string')
      ? principalDisplayName.trim()
      : principalEmail.trim(),
  });
  const principalUid = userRecord.uid;

  const schoolRef = db.collection('schools').doc();
  await schoolRef.set({
    name: name.trim(),
    address: address && typeof address === 'string' ? address.trim() || undefined : undefined,
    contactEmail: contactEmail && typeof contactEmail === 'string' ? contactEmail.trim() || undefined : undefined,
    contactPhone: contactPhone && typeof contactPhone === 'string' ? contactPhone.trim() || undefined : undefined,
    description: description && typeof description === 'string' ? description.trim() || undefined : undefined,
    website: website && typeof website === 'string' ? website.trim() || undefined : undefined,
    subscriptionStatus: 'active',
    createdAt: now,
    updatedAt: now,
  });
  const schoolId = schoolRef.id;

  await db.collection('users').doc(principalUid).set({
    email: principalEmail.trim(),
    displayName: (principalDisplayName && typeof principalDisplayName === 'string')
      ? principalDisplayName.trim()
      : principalEmail.trim(),
    role: 'principal',
    roles: ['principal'],
    schoolId,
    createdAt: now,
    updatedAt: now,
  });

  await schoolRef.set(
    {
      principalUid,
      principalUids: [principalUid],
      principalEmail: principalEmail.trim(),
      principalName: (principalDisplayName && typeof principalDisplayName === 'string')
        ? principalDisplayName.trim()
        : principalEmail.trim(),
      updatedAt: now,
    },
    { merge: true }
  );

  return { schoolId, principalUid };
});

/** Sets subscription suspended + onboarding SUSPENDED (or restores). Callable by super_admin only. */
export const adminSetSchoolSuspended = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Must be signed in.');
  const db = admin.firestore();
  const caller = await requireCallerProfile(db, context.auth.uid);
  if (!userHasRole(caller, 'super_admin')) {
    throw new functions.https.HttpsError('permission-denied', 'Only super admins can change school suspension.');
  }
  const { schoolId, suspended } = data as { schoolId?: string; suspended?: boolean };
  if (!schoolId || typeof schoolId !== 'string' || !schoolId.trim()) {
    throw new functions.https.HttpsError('invalid-argument', 'schoolId is required.');
  }
  if (typeof suspended !== 'boolean') {
    throw new functions.https.HttpsError('invalid-argument', 'suspended must be a boolean.');
  }
  const ref = db.collection('schools').doc(schoolId.trim());
  const snap = await ref.get();
  if (!snap.exists) throw new functions.https.HttpsError('not-found', 'School not found.');
  const now = isoNow();
  await ref.update({
    subscriptionStatus: suspended ? ('suspended' as const) : ('active' as const),
    status: suspended ? ('SUSPENDED' as const) : ('ACTIVE' as const),
    updatedAt: now,
  });
  return { ok: true as const };
});
