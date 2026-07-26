import { getFunctions, httpsCallable } from 'firebase/functions';
import app, { auth } from '../config/firebase';
import type { UserProfile, UserRole } from '../../../shared/types';

export const MOBILE_PORTAL_ROLES: readonly UserRole[] = ['teacher', 'parent'] as const;

type RoleProfileSlice = {
  role?: string | null;
  roles?: string[] | null;
};

/** Normalize legacy single-role docs to a roles array + active role. */
export function normalizeUserRoles(data: RoleProfileSlice | null | undefined): {
  roles: UserRole[];
  role: UserRole | undefined;
} {
  const rawRoles = Array.isArray(data?.roles)
    ? data!.roles!.filter((r): r is string => typeof r === 'string' && r.trim().length > 0)
    : [];
  const single = typeof data?.role === 'string' && data.role.trim() ? data.role.trim() : undefined;
  const merged = Array.from(new Set([...(rawRoles.length ? rawRoles : []), ...(single ? [single] : [])]));
  const roles = merged as UserRole[];
  const role = (single && roles.includes(single as UserRole) ? single : roles[0]) as UserRole | undefined;
  return { roles, role };
}

export function profileRoles(profile: Pick<UserProfile, 'role' | 'roles'> | null | undefined): UserRole[] {
  return normalizeUserRoles(profile).roles;
}

export function getEligibleRoles(
  profile: Pick<UserProfile, 'role' | 'roles'> | null | undefined,
  platformRoles: readonly UserRole[]
): UserRole[] {
  const held = profileRoles(profile);
  return platformRoles.filter((r) => held.includes(r));
}

export function roleDisplayLabel(role: UserRole): string {
  switch (role) {
    case 'principal':
      return 'School manager';
    case 'super_admin':
      return 'Super admin';
    case 'teacher':
      return 'Teacher';
    case 'parent':
      return 'Parent';
    default:
      return role;
  }
}

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
