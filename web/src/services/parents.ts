/**
 * Parent management: invite parent to child, update parent profile.
 * Calls Firebase Cloud Functions.
 */
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getDoc, doc } from 'firebase/firestore';
import { app } from '@/config/firebase';
import type { CheckParentEmailResult } from '@/constants/parents';
import type { Child } from 'shared/types';
import { db } from '@/config/firebase';

export interface InviteParentParams {
  childId: string;
  parentEmail: string;
  parentDisplayName?: string;
  parentPhone?: string;
  /** Required only for new accounts; leave empty to link an existing parent by email. */
  parentPassword?: string;
}

export interface UpdateParentParams {
  parentUid: string;
  displayName?: string;
  phone?: string;
  isActive?: boolean;
}

/** Extract a user-friendly error message from a callable error. */
export function getCallableErrorMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'message' in err) {
    return String((err as { message: string }).message);
  }
  if (err && typeof err === 'object' && 'details' in err) {
    return String((err as { details: unknown }).details);
  }
  return 'Something went wrong';
}

/** Check if a parent account with this email exists and can be linked. Principal only. */
export async function checkParentEmail(email: string): Promise<CheckParentEmailResult> {
  const functions = getFunctions(app);
  const check = httpsCallable<{ email: string }, CheckParentEmailResult>(functions, 'checkParentEmail');
  const result = await check({ email: email.trim() });
  return result.data;
}

/** Invite a new parent to a child. Returns updated child if you refetched from Firestore. */
export async function principalInviteParent(params: {
  childId: string;
  parentEmail: string;
  parentDisplayName?: string;
  parentPhone?: string;
}): Promise<{ token: string; expiresAt: string }> {
  const functions = getFunctions(app);
  const fn = httpsCallable<
    { childId: string; parentEmail: string; parentDisplayName?: string; parentPhone?: string },
    { token: string; expiresAt: string }
  >(functions, 'principalInviteParent');
  const res = await fn({
    childId: params.childId,
    parentEmail: params.parentEmail.trim(),
    parentDisplayName: params.parentDisplayName?.trim() || undefined,
    parentPhone: params.parentPhone?.trim() || undefined,
  });
  return res.data;
}

export async function inviteParentToChild(params: InviteParentParams): Promise<void> {
  const functions = getFunctions(app);
  const invite = httpsCallable<
    {
      childId: string;
      parentEmail: string;
      parentDisplayName?: string;
      parentPhone?: string;
      parentPassword?: string;
    },
    { parentUid: string; linked?: boolean }
  >(functions, 'inviteParentToChild');
  await invite({
    childId: params.childId,
    parentEmail: params.parentEmail.trim(),
    parentDisplayName: params.parentDisplayName?.trim() || undefined,
    parentPhone: params.parentPhone?.trim() || undefined,
    parentPassword: params.parentPassword || undefined,
  });
}

/** Update a parent's profile (display name, phone, isActive). */
/** Remove parent from one child at this school. Deletes their account if they have no other children here. */
export async function principalRemoveParentFromChild(params: {
  childId: string;
  parentUid: string;
}): Promise<{ deletedAccount: boolean }> {
  const functions = getFunctions(app);
  const fn = httpsCallable<
    { childId: string; parentUid: string },
    { ok: boolean; deletedAccount?: boolean }
  >(functions, 'principalRemoveParentFromChild');
  const res = await fn({
    childId: params.childId.trim(),
    parentUid: params.parentUid.trim(),
  });
  return { deletedAccount: Boolean(res.data.deletedAccount) };
}

/** Unlink parent from every child at the school and delete their account and sign-in. */
export async function principalDeleteParent(parentUid: string): Promise<void> {
  const functions = getFunctions(app);
  const fn = httpsCallable<{ parentUid: string }, { ok: boolean }>(functions, 'principalDeleteParent');
  await fn({ parentUid: parentUid.trim() });
}

export async function updateParent(params: UpdateParentParams): Promise<void> {
  const functions = getFunctions(app);
  const updateParentFn = httpsCallable<
    { parentUid: string; displayName?: string; phone?: string; isActive?: boolean },
    { ok: boolean }
  >(functions, 'updateParent');
  await updateParentFn({
    parentUid: params.parentUid,
    displayName: params.displayName?.trim() || undefined,
    phone: params.phone?.trim() || undefined,
    isActive: params.isActive,
  });
}

/** Refetch a child document from Firestore (e.g. after inviting a parent to get new parentIds). */
export async function refetchChild(schoolId: string, childId: string): Promise<Child | null> {
  const childSnap = await getDoc(doc(db, 'schools', schoolId, 'children', childId));
  if (!childSnap.exists()) return null;
  return { id: childSnap.id, ...childSnap.data() } as Child;
}
