import { getFunctions, httpsCallable } from 'firebase/functions';
import app, { auth } from '../config/firebase';
import { MOBILE_PORTAL_ROLES, getEligibleRoles } from '@shared/roles';
import type { UserProfile, UserRole } from '@shared/types';

export { normalizeUserRoles, roleDisplayLabel } from '@shared/roles';

export function getMobileEligibleRoles(
  profile: Pick<UserProfile, 'role' | 'roles'> | null | undefined
): UserRole[] {
  return getEligibleRoles(profile, MOBILE_PORTAL_ROLES);
}

export async function selectActiveRole(role: UserRole): Promise<void> {
  const fn = httpsCallable(getFunctions(app), 'selectActiveRole');
  await fn({ role });
  const u = auth.currentUser;
  if (u) await u.getIdToken(true);
}
