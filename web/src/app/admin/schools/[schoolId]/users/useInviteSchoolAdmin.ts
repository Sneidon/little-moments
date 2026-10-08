import { useInviteForm } from '@/hooks/useInviteForm';
import { EMPTY_SCHOOL_ADMIN_INVITE, inviteSchoolAdmin, type InviteSchoolAdminFormState } from '@/services/staffInvites';

export function useInviteSchoolAdmin(schoolId: string | undefined) {
  return useInviteForm<InviteSchoolAdminFormState>({
    initial: EMPTY_SCHOOL_ADMIN_INVITE,
    validate: (f) => (f.principalEmail.trim() ? null : 'Email is required.'),
    send: (f) => inviteSchoolAdmin(schoolId as string, f),
  });
}
