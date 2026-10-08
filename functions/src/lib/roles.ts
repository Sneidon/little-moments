import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

export type AppUserRole = 'teacher' | 'parent' | 'principal' | 'super_admin';

export type RoleProfileSlice = {
  role?: string | null;
  roles?: string[] | null;
  schoolId?: string | null;
  displayName?: string;
};

export function normalizeUserRoles(data: RoleProfileSlice | null | undefined): {
  roles: AppUserRole[];
  role: AppUserRole | undefined;
} {
  const rawRoles = Array.isArray(data?.roles)
    ? data!.roles!.filter((r): r is string => typeof r === 'string' && r.trim().length > 0)
    : [];
  const single = typeof data?.role === 'string' && data.role.trim() ? data.role.trim() : undefined;
  const merged = Array.from(new Set([...(rawRoles.length ? rawRoles : []), ...(single ? [single] : [])]));
  const roles = merged as AppUserRole[];
  const role = (single && roles.includes(single as AppUserRole) ? single : roles[0]) as AppUserRole | undefined;
  return { roles, role };
}

export function userHasRole(data: RoleProfileSlice | null | undefined, role: AppUserRole): boolean {
  return normalizeUserRoles(data).roles.includes(role);
}

/** Merge a role onto an existing profile; optionally set it as the active portal role. */
export function roleMergePayload(
  existing: RoleProfileSlice | null | undefined,
  addRole: AppUserRole,
  opts?: { setActive?: boolean; schoolId?: string | null }
): { roles: AppUserRole[]; role: AppUserRole; schoolId?: string } {
  const { roles: held, role: active } = normalizeUserRoles(existing);
  const roles = Array.from(new Set([...held, addRole])) as AppUserRole[];
  const setActive = opts?.setActive !== false;
  const role = setActive ? addRole : (active && roles.includes(active) ? active : addRole);
  const out: { roles: AppUserRole[]; role: AppUserRole; schoolId?: string } = { roles, role };
  const nextSchool =
    opts?.schoolId !== undefined && opts?.schoolId !== null
      ? opts.schoolId
      : existing?.schoolId ?? undefined;
  if (typeof nextSchool === 'string' && nextSchool.trim()) {
    out.schoolId = nextSchool.trim();
  }
  return out;
}

export function assertStaffSchoolConflict(
  existing: RoleProfileSlice | null | undefined,
  staffRole: 'teacher' | 'principal',
  schoolId: string
): void {
  const { roles } = normalizeUserRoles(existing);
  const sid = existing?.schoolId?.trim();
  if (roles.includes(staffRole) && sid && sid !== schoolId) {
    throw new functions.https.HttpsError(
      'failed-precondition',
      staffRole === 'teacher'
        ? 'This email is already used as a teacher at another school.'
        : 'This email is already used as a principal at another school.'
    );
  }
  if (roles.includes(staffRole) && sid === schoolId) {
    throw new functions.https.HttpsError(
      'failed-precondition',
      staffRole === 'teacher'
        ? 'You are already a teacher at this school.'
        : 'This account is already a principal at this school.'
    );
  }
}

/** Resolve Auth user for an invite: existing accounts keep password; new ones require one. */
export async function resolveAuthForInviteAccept(params: {
  emailNorm: string;
  emailRaw: string;
  password?: string;
  displayName?: string | null;
}): Promise<{ uid: string; existed: boolean; displayName: string }> {
  const formDisplay =
    params.displayName && typeof params.displayName === 'string' && params.displayName.trim()
      ? params.displayName.trim()
      : null;
  try {
    const existing = await admin.auth().getUserByEmail(params.emailNorm);
    const display = formDisplay ?? existing.displayName ?? params.emailRaw;
    if (formDisplay) {
      await admin.auth().updateUser(existing.uid, { displayName: formDisplay });
    }
    return { uid: existing.uid, existed: true, displayName: display };
  } catch (err: unknown) {
    const code = err && typeof err === 'object' && 'code' in err ? String((err as { code: string }).code) : '';
    if (code !== 'auth/user-not-found') throw err;
  }
  if (!params.password || typeof params.password !== 'string' || params.password.length < 6) {
    throw new functions.https.HttpsError('invalid-argument', 'password must be at least 6 characters.');
  }
  const newDisplay = formDisplay ?? params.emailRaw;
  const userRecord = await admin.auth().createUser({
    email: params.emailNorm,
    password: params.password,
    displayName: newDisplay,
  });
  return { uid: userRecord.uid, existed: false, displayName: newDisplay };
}
