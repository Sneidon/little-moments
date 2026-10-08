import type { UserProfile } from 'shared/types';

export function getTeacherDisplayName(uid: string, teachers: UserProfile[]): string {
  const t = teachers.find((x) => x.uid === uid);
  return t ? (t.preferredName || t.displayName) || uid : uid;
}
