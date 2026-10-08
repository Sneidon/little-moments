import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { MAX_PARENTS_PER_CHILD } from '../lib/config';
import { RoleProfileSlice, normalizeUserRoles, roleMergePayload, userHasRole } from '../lib/roles';

/** Parent linking is allowed for any existing account (multi-role). */
async function getExistingUserLinkability(
  _db: admin.firestore.Firestore,
  _uid: string,
  _authRole?: string | null
): Promise<{ canLink: true }> {
  return { canLink: true };
}

// Check whether a user with this email already exists. Callable by principal only.
// Used to decide whether to "link existing" or "create & link" when inviting a parent.
export const checkParentEmail = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be signed in.');
  }
  const callerUid = context.auth.uid;
  const db = admin.firestore();
  const callerSnap = await db.collection('users').doc(callerUid).get();
  const callerData = callerSnap.exists ? (callerSnap.data() as { role?: string; schoolId?: string }) : null;
  if (!userHasRole(callerData, 'principal') || !callerData?.schoolId) {
    throw new functions.https.HttpsError('permission-denied', 'Only principals can check parent email.');
  }
  const { email } = data as { email?: string };
  if (!email || typeof email !== 'string' || !email.trim()) {
    throw new functions.https.HttpsError('invalid-argument', 'Email is required.');
  }
  const emailNorm = email.trim().toLowerCase();
  try {
    const authUser = await admin.auth().getUserByEmail(emailNorm);
    await getExistingUserLinkability(db, authUser.uid, (authUser.customClaims as { role?: string } | undefined)?.role);
    return { exists: true, canLink: true };
  } catch (err: unknown) {
    const code = err && typeof err === 'object' && 'code' in err ? (err as { code: string }).code : '';
    if (code === 'auth/user-not-found') {
      return { exists: false };
    }
    throw err;
  }
});

// Invite a parent to a child. Callable by principal only.
// If a user with that email already exists, links them to the child (adds to parentIds).
// Otherwise creates Auth user + users doc (role=parent) and adds to parentIds. Max 4 parents per child.
export const inviteParentToChild = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be signed in.');
  }
  const callerUid = context.auth.uid;
  const db = admin.firestore();
  const callerSnap = await db.collection('users').doc(callerUid).get();
  const callerData = callerSnap.exists ? (callerSnap.data() as { role?: string; schoolId?: string }) : null;
  if (!userHasRole(callerData, 'principal') || !callerData?.schoolId) {
    throw new functions.https.HttpsError('permission-denied', 'Only principals can invite parents.');
  }
  const schoolId = callerData.schoolId;

  const { childId, parentEmail, parentDisplayName, parentPhone, parentPassword } = data as {
    childId?: string;
    parentEmail?: string;
    parentDisplayName?: string;
    parentPhone?: string;
    parentPassword?: string;
  };

  if (!childId || typeof childId !== 'string' || !childId.trim()) {
    throw new functions.https.HttpsError('invalid-argument', 'Child ID is required.');
  }
  if (!parentEmail || typeof parentEmail !== 'string' || !parentEmail.trim()) {
    throw new functions.https.HttpsError('invalid-argument', 'Parent email is required.');
  }

  const childRef = db.collection('schools').doc(schoolId).collection('children').doc(childId);
  const childSnap = await childRef.get();
  if (!childSnap.exists) {
    throw new functions.https.HttpsError('not-found', 'Child not found.');
  }
  const parentIds = (childSnap.data() as { parentIds?: string[] })?.parentIds ?? [];
  if (parentIds.length >= MAX_PARENTS_PER_CHILD) {
    throw new functions.https.HttpsError(
      'failed-precondition',
      `This child already has the maximum of ${MAX_PARENTS_PER_CHILD} parents.`
    );
  }

  const now = new Date().toISOString();
  const emailTrim = parentEmail.trim();
  const phone = (parentPhone && typeof parentPhone === 'string') ? parentPhone.trim() || undefined : undefined;
  const displayName = (parentDisplayName && typeof parentDisplayName === 'string') ? parentDisplayName.trim() : undefined;

  let parentUid: string;
  let linked = false;

  try {
    const existingUser = await admin.auth().getUserByEmail(emailTrim.toLowerCase());
    parentUid = existingUser.uid;
    linked = true;

    if (parentIds.includes(parentUid)) {
      throw new functions.https.HttpsError('failed-precondition', 'This parent is already linked to this child.');
    }

    const authRole = (existingUser.customClaims as { role?: string } | undefined)?.role;
    await getExistingUserLinkability(db, parentUid, authRole);

    const userRef = db.collection('users').doc(parentUid);
    const userSnap = await userRef.get();
    const prior = userSnap.exists ? (userSnap.data() as RoleProfileSlice) : null;
    const roleFields = roleMergePayload(prior, 'parent', {
      setActive: !prior || !normalizeUserRoles(prior).role,
      schoolId: (prior?.schoolId as string | undefined) || schoolId,
    });
    const updates: Record<string, unknown> = {
      ...roleFields,
      updatedAt: now,
    };
    if (!prior?.schoolId) updates.schoolId = schoolId;
    if (displayName) updates.displayName = displayName;
    if (phone !== undefined) updates.phone = phone;

    if (userSnap.exists) {
      await userRef.update(updates);
    } else {
      await userRef.set({
        email: emailTrim,
        displayName: displayName ?? emailTrim,
        ...(phone ? { phone } : {}),
        ...roleFields,
        schoolId,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
    }

    const newParentIds = [...parentIds, parentUid];
    await childRef.update({
      parentIds: newParentIds,
      updatedAt: now,
    });
  } catch (err: unknown) {
    const code = err && typeof err === 'object' && 'code' in err ? (err as { code: string }).code : '';
    if (code === 'auth/user-not-found') {
      if (!parentPassword || typeof parentPassword !== 'string' || parentPassword.length < 6) {
        throw new functions.https.HttpsError('invalid-argument', 'Password (min 6 characters) is required for new accounts.');
      }
      const userRecord = await admin.auth().createUser({
        email: emailTrim,
        password: parentPassword,
        displayName: displayName ?? emailTrim,
      });
      parentUid = userRecord.uid;
      await db.collection('users').doc(parentUid).set({
        email: emailTrim,
        displayName: displayName ?? emailTrim,
        ...(phone ? { phone } : {}),
        role: 'parent',
        roles: ['parent'],
        schoolId,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
      const newParentIds = [...parentIds, parentUid];
      await childRef.update({
        parentIds: newParentIds,
        updatedAt: now,
      });
    } else if (err && typeof err === 'object' && 'message' in err && (err as { message: string }).message?.includes('already linked')) {
      throw err;
    } else {
      throw err;
    }
  }

  return { parentUid, linked };
});
