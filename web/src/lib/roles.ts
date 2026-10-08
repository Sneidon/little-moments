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
  userHasRole,
} from 'shared/roles';

export {
  WEB_PORTAL_ROLES,
  getEligibleRoles,
  portalPathForRole,
  roleDisplayLabel,
  profileRoles,
  normalizeUserRoles,
  userHasRole,
};

export function getWebEligibleRoles(profile: Pick<UserProfile, 'role' | 'roles'> | null | undefined): UserRole[] {
  return getEligibleRoles(profile, WEB_PORTAL_ROLES);
}

export async function selectActiveRole(role: UserRole): Promise<void> {
  const functions = getFunctions(app);
  const fn = httpsCallable(functions, 'selectActiveRole');
  await fn({ role });
  const u = auth.currentUser;
  if (u) await u.getIdToken(true);
}
