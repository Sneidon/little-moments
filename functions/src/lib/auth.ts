import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { RoleProfileSlice, normalizeUserRoles } from './roles';

export async function requireCallerProfile(
  db: admin.firestore.Firestore,
  uid: string
): Promise<RoleProfileSlice & { displayName?: string }> {
  const snap = await db.collection('users').doc(uid).get();
  if (!snap.exists) return {};
  return snap.data() as RoleProfileSlice & { displayName?: string };
}

export function requireRoleAllowed(
  caller: RoleProfileSlice,
  allowed: Array<'super_admin' | 'principal' | 'teacher' | 'parent'>,
  opts?: { schoolId?: string; message?: string }
): void {
  const { roles } = normalizeUserRoles(caller);
  if (!roles.some((r) => allowed.includes(r))) {
    throw new functions.https.HttpsError('permission-denied', opts?.message || 'Not allowed.');
  }
  if (opts?.schoolId && caller.schoolId !== opts.schoolId) {
    throw new functions.https.HttpsError('permission-denied', opts.message || 'Wrong school.');
  }
}
