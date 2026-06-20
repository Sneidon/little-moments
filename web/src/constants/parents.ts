/** Maximum number of parents that can be linked to a single child. */
export const MAX_PARENTS = 4;

const NON_PARENT_ROLE_LABELS: Record<string, string> = {
  teacher: 'a teacher',
  principal: 'a principal',
  super_admin: 'a super admin',
};

/** User-facing message when an email belongs to staff/admin, not a parent. */
export function nonParentEmailError(role: string): string {
  const label = NON_PARENT_ROLE_LABELS[role] ?? `a ${role.replace(/_/g, ' ')} account`;
  return `This email can't be used because it is already registered as ${label}.`;
}

export interface CheckParentEmailResult {
  exists: boolean;
  canLink?: boolean;
  existingRole?: string;
}
