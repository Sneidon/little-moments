/**
 * Multi-role helpers shared by web, mobile, and (via copy) functions.
 */

import type { UserProfile, UserRole } from './types';

export const WEB_PORTAL_ROLES: readonly UserRole[] = ['principal', 'super_admin'] as const;
export const MOBILE_PORTAL_ROLES: readonly UserRole[] = ['teacher', 'parent'] as const;

export type RoleProfileSlice = {
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

export function userHasRole(data: RoleProfileSlice | null | undefined, role: UserRole): boolean {
  return normalizeUserRoles(data).roles.includes(role);
}

export function profileRoles(profile: Pick<UserProfile, 'role' | 'roles'> | null | undefined): UserRole[] {
  return normalizeUserRoles(profile).roles;
}

/** Roles the current platform can open as a portal. */
export function getEligibleRoles(
  profile: Pick<UserProfile, 'role' | 'roles'> | null | undefined,
  platformRoles: readonly UserRole[]
): UserRole[] {
  const held = profileRoles(profile);
  return platformRoles.filter((r) => held.includes(r));
}

export function portalPathForRole(role: UserRole): string | null {
  if (role === 'principal') return '/principal';
  if (role === 'super_admin') return '/admin';
  return null;
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
