import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { resolveAuthForInviteAccept } from '../roles';

export type InviteDoc = {
  token: string;
  email: string;
  role: string;
  schoolName?: string;
  principalName?: string;
  className?: string;
  inviteeDisplayName?: string;
  inviteePreferredName?: string;
  inviteePhone?: string;
  childId?: string;
  childName?: string;
  logoUrl?: string;
  schoolId?: string;
  createdSchoolId?: string;
  expiresAt: string;
  usedAt?: string;
};

export type AcceptContext = {
  db: admin.firestore.Firestore;
  ref: admin.firestore.DocumentReference;
  invite: InviteDoc;
  emailRaw: string;
  emailNorm: string;
  now: string;
  password?: string;
  displayFromForm: string | null;
  displayFromInvite: string | null;
};

export function trimmed(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

// Runs `inspect` against the existing Auth user, if any. Returns whether an account exists.
export async function checkExistingAccount(emailNorm: string, inspect: (uid: string) => Promise<void> | void): Promise<boolean> {
  try {
    const existing = await admin.auth().getUserByEmail(emailNorm);
    await inspect(existing.uid);
    return true;
  } catch (err: unknown) {
    if (err instanceof functions.https.HttpsError) throw err;
    const code = err && typeof err === 'object' && 'code' in err ? (err as { code: string }).code : '';
    if (code !== 'auth/user-not-found') throw err;
    return false;
  }
}

// New accounts get a display name from the invite; existing accounts keep theirs unless the form supplies one.
export function resolveInviteAuth(ctx: AcceptContext, accountExists: boolean, inviteDisplay = ctx.displayFromInvite) {
  return resolveAuthForInviteAccept({
    emailNorm: ctx.emailNorm,
    emailRaw: ctx.emailRaw,
    password: ctx.password,
    displayName: ctx.displayFromForm ?? (accountExists ? null : inviteDisplay),
  });
}

export function logEmailFailure(label: string) {
  return (e: unknown) => functions.logger.warn(`${label} failed`, { message: e instanceof Error ? e.message : String(e) });
}
