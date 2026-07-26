import { getFunctions, httpsCallable } from 'firebase/functions';
import { auth, app } from '@/config/firebase';
import type { UserProfile, UserRole } from 'shared/types';
import {
  WEB_PORTAL_ROLES,
  getEligibleRoles,
  portalPathForRole,
  roleDisplayLabel,
  profileRoles,
  normalizeUserRoles,
} from 'shared/roles';

export {
  WEB_PORTAL_ROLES,
  getEligibleRoles,
  portalPathForRole,
  roleDisplayLabel,
  profileRoles,
  normalizeUserRoles,
};

export function getWebEligibleRoles(profile: Pick<UserProfile, 'role' | 'roles'> | null | undefined): UserRole[] {
  return getEligibleRoles(profile, WEB_PORTAL_ROLES);
}

/** Whether a user profile holds a given role (roles[] or legacy role). */
export function userHoldsRole(
  profile: { role?: string | null; roles?: string[] | null } | null | undefined,
  role: UserRole
): boolean {
  return profileRoles(profile as Pick<UserProfile, 'role' | 'roles'> | null | undefined).includes(role);
}

/** Set active portal role via Cloud Function and refresh the ID token. */
export async function selectActiveRole(role: UserRole): Promise<void> {
  const functions = getFunctions(app);
  const fn = httpsCallable(functions, 'selectActiveRole');
  await fn({ role });
  const u = auth.currentUser;
  if (u) await u.getIdToken(true);
}
