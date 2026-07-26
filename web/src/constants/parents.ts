/** Maximum number of parents that can be linked to a single child. */
export const MAX_PARENTS = 4;

/** @deprecated Multi-role allows linking staff emails as parents; kept for legacy UI paths. */
export function nonParentEmailError(role: string): string {
  return `This email is already registered as ${role.replace(/_/g, ' ')}. It can still be linked as a parent.`;
}

export interface CheckParentEmailResult {
  exists: boolean;
  canLink?: boolean;
  existingRole?: string;
}
