/** Mirrors Firestore `schoolIsOperational` — keep in sync when gating principals/parents. */
export function isSchoolOperational(doc: {
  subscriptionStatus?: string;
  status?: string;
} | null | undefined): boolean {
  if (!doc) return false;
  if (doc.subscriptionStatus && doc.subscriptionStatus !== 'active') return false;
  if (doc.status && doc.status !== 'ACTIVE') return false;
  return true;
}
