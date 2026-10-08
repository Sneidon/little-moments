import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { userHasRole } from '../../lib/roles';

/** Remove inviteTokens doc. Super admin: any. Principal: only teacher/parent invites for their school. */
export const deleteInviteToken = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Must be signed in.');
  const callerUid = context.auth.uid;
  const db = admin.firestore();
  const callerSnap = await db.collection('users').doc(callerUid).get();
  const callerData = callerSnap.exists ? (callerSnap.data() as { role?: string; schoolId?: string }) : {};

  const { inviteId } = data as { inviteId?: string };
  if (!inviteId || typeof inviteId !== 'string' || !inviteId.trim()) {
    throw new functions.https.HttpsError('invalid-argument', 'inviteId is required.');
  }
  const inviteRef = db.collection('inviteTokens').doc(inviteId.trim());
  const inviteSnap = await inviteRef.get();
  if (!inviteSnap.exists) throw new functions.https.HttpsError('not-found', 'Invite not found.');
  const inv = inviteSnap.data() as { role?: string; schoolId?: string };

  const isSuper = userHasRole(callerData, 'super_admin');
  const isPrincipalOk =
    userHasRole(callerData, 'principal') &&
    callerData.schoolId &&
    (inv.role === 'teacher' || inv.role === 'parent') &&
    inv.schoolId === callerData.schoolId;

  if (!isSuper && !isPrincipalOk) {
    throw new functions.https.HttpsError('permission-denied', 'You cannot delete this invite.');
  }

  await inviteRef.delete();
  return { ok: true };
});

/** Teacher & parent invites for the principal's school (for Invitations page). */
export const listPrincipalSchoolInvites = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Must be signed in.');
  const callerUid = context.auth.uid;
  const db = admin.firestore();
  const callerSnap = await db.collection('users').doc(callerUid).get();
  const callerData = callerSnap.exists ? (callerSnap.data() as { role?: string; schoolId?: string }) : {};
  if (!userHasRole(callerData, 'principal') || !callerData.schoolId) {
    throw new functions.https.HttpsError('permission-denied', 'Only principals can list school invitations.');
  }
  const schoolId = callerData.schoolId;
  const schoolSnapForInvites = await db.collection('schools').doc(schoolId).get();
  const schoolDataForInvites = schoolSnapForInvites.exists
    ? (schoolSnapForInvites.data() as { principalName?: string })
    : null;
  const schoolPrincipalNameForInvites =
    schoolDataForInvites?.principalName?.trim() || undefined;
  const snap = await db.collection('inviteTokens').where('schoolId', '==', schoolId).get();
  type Row = {
    id: string;
    /** Same as invite doc id in normal flow; echoed for `/invite/accept?token=` deep links on the Principal UI. */
    token: string;
    email: string;
    role: 'teacher' | 'parent';
    schoolName?: string;
    /** Principal / school display name for teacher-invite PDF/email-style copy. */
    principalName?: string;
    /** When the teacher was invited for a specific class. */
    className?: string;
    childId?: string;
    childName?: string;
    inviteeDisplayName?: string;
    expiresAt: string;
    usedAt?: string;
    createdAt: string;
  };
  const invites: Row[] = [];
  for (const d of snap.docs) {
    const row = d.data() as {
      token?: string;
      email?: string;
      role?: string;
      schoolName?: string;
      className?: string;
      childId?: string;
      childName?: string;
      inviteeDisplayName?: string;
      expiresAt?: string;
      usedAt?: string;
      createdAt?: string;
    };
    if (row.role !== 'teacher' && row.role !== 'parent') continue;
    if (!row.email || !row.expiresAt || !row.createdAt) continue;
    const bearer =
      row.token && typeof row.token === 'string' && row.token.trim() ? row.token.trim() : d.id;
    const classLabel =
      row.className && typeof row.className === 'string' && row.className.trim()
        ? row.className.trim()
        : undefined;
    invites.push({
      id: d.id,
      token: bearer,
      email: row.email,
      role: row.role as 'teacher' | 'parent',
      schoolName: row.schoolName,
      principalName: schoolPrincipalNameForInvites,
      className: classLabel,
      childId: row.childId,
      childName: row.childName,
      inviteeDisplayName: row.inviteeDisplayName,
      expiresAt: row.expiresAt,
      usedAt: row.usedAt,
      createdAt: row.createdAt,
    });
  }
  invites.sort((a, b) => {
    const aTs = new Date(a.createdAt).getTime();
    const bTs = new Date(b.createdAt).getTime();
    return (Number.isFinite(bTs) ? bTs : 0) - (Number.isFinite(aTs) ? aTs : 0);
  });
  return { invites };
});

/** Public: whether an invite link is still usable (no password). */
export const peekInviteToken = functions.https.onCall(async (data) => {
  const { token } = data as { token?: string };
  if (!token || typeof token !== 'string' || !token.trim()) {
    throw new functions.https.HttpsError('invalid-argument', 'token is required.');
  }
  const db = admin.firestore();
  const snap = await db.collection('inviteTokens').doc(token.trim()).get();
  if (!snap.exists) return { status: 'not_found' as const };
  const row = snap.data() as { expiresAt?: string; usedAt?: string; role?: string; email?: string };
  const role = typeof row.role === 'string' ? row.role : undefined;
  if (row.usedAt) return { status: 'used' as const, role };
  if (row.expiresAt && new Date(row.expiresAt).getTime() < Date.now()) {
    return { status: 'expired' as const, role };
  }
  let accountExists = false;
  const emailNorm = typeof row.email === 'string' ? row.email.trim().toLowerCase() : '';
  if (emailNorm) {
    try {
      await admin.auth().getUserByEmail(emailNorm);
      accountExists = true;
    } catch (err: unknown) {
      const code = err && typeof err === 'object' && 'code' in err ? String((err as { code: string }).code) : '';
      if (code !== 'auth/user-not-found') throw err;
    }
  }
  return {
    status: 'pending' as const,
    role,
    accountExists,
    email: emailNorm || undefined,
  };
});
