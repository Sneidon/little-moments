import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '@/config/firebase';

export type InviteTeacherFormState = { teacherEmail: string; teacherDisplayName: string; teacherPreferredName: string };
export type InviteSchoolAdminFormState = { principalEmail: string; principalName: string };

export const EMPTY_TEACHER_INVITE: InviteTeacherFormState = { teacherEmail: '', teacherDisplayName: '', teacherPreferredName: '' };
export const EMPTY_SCHOOL_ADMIN_INVITE: InviteSchoolAdminFormState = { principalEmail: '', principalName: '' };

type InviteResult = { token?: string; expiresAt?: string };

export async function inviteTeacher(form: InviteTeacherFormState): Promise<InviteResult> {
  const call = httpsCallable<{ teacherEmail: string; teacherDisplayName?: string; teacherPreferredName?: string }, InviteResult>(
    getFunctions(app),
    'principalInviteTeacher'
  );
  const res = await call({
    teacherEmail: form.teacherEmail.trim(),
    teacherDisplayName: form.teacherDisplayName.trim() || undefined,
    teacherPreferredName: form.teacherPreferredName.trim() || undefined,
  });
  return res.data;
}

export async function inviteSchoolAdmin(schoolId: string, form: InviteSchoolAdminFormState): Promise<InviteResult> {
  const call = httpsCallable<{ schoolId: string; principalEmail: string; principalName?: string }, InviteResult>(
    getFunctions(app),
    'inviteSchoolPrincipal'
  );
  const res = await call({ schoolId, principalEmail: form.principalEmail.trim(), principalName: form.principalName.trim() || undefined });
  return res.data;
}
