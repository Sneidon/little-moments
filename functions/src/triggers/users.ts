import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { RoleProfileSlice, normalizeUserRoles } from '../lib/roles';

// Set custom claims when a user document is created or updated in Firestore
// so that request.auth.token.role and request.auth.token.schoolId are available in security rules.
export const setUserClaims = functions.firestore
  .document('users/{userId}')
  .onWrite(async (change, context) => {
    const userId = context.params.userId;
    const data = change.after.exists ? change.after.data() : null;
    if (!data || !userId) return null;
    const { roles, role } = normalizeUserRoles(data as RoleProfileSlice);
    const schoolId = (data as { schoolId?: string }).schoolId as string | undefined;

    // Backfill roles[] on legacy docs so clients can detect multi-role.
    if (roles.length && (!Array.isArray((data as { roles?: unknown }).roles) || (data as { roles: string[] }).roles.length === 0)) {
      try {
        await change.after.ref.set({ roles }, { merge: true });
      } catch (e) {
        functions.logger.warn('setUserClaims roles backfill failed', userId, e);
      }
    }

    const claims: Record<string, string> = {};
    if (role) claims.role = role;
    if (schoolId) claims.schoolId = schoolId;
    try {
      await admin.auth().setCustomUserClaims(userId, claims);
    } catch (e) {
      functions.logger.error('setUserClaims failed', userId, e);
    }
    return null;
  });
