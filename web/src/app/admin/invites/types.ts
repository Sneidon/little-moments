export type AdminInvite = {
  id: string;
  token?: string;
  schoolId?: string;
  createdSchoolId?: string;
  schoolName?: string;
  principalName?: string;
  className?: string;
  childId?: string;
  childName?: string;
  email: string;
  role: 'principal' | 'teacher' | 'parent' | 'super_admin';
  inviteeDisplayName?: string;
  expiresAt: string;
  usedAt?: string;
  createdAt: string;
};
