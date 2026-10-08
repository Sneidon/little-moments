export type SubscriptionStatus = 'active' | 'suspended';

export type SchoolOnboardingStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED';

/** School feature flags - enable/disable per-feature. Default true when undefined. */
export interface SchoolFeatures {
  nappyChange?: boolean;
  napTime?: boolean;
  meal?: boolean;
  medication?: boolean;
  incident?: boolean;
  media?: boolean;
  /** Premium: personalised per-child QR codes from roster CSV. */
  personalisedQr?: boolean;
}

export interface School {
  id: string;
  name: string;
  /** Public join slug used for /join/:schoolSlug. */
  slug?: string;
  /** Onboarding lifecycle status (separate from subscription billing status). */
  status?: SchoolOnboardingStatus;
  /** Branding/logo used on join and QR code. */
  logoUrl?: string;
  /** Principal uid once invite is accepted (primary / first admin; optional when multiple). */
  principalUid?: string;
  /** All school admin (principal) uids for this school. */
  principalUids?: string[];
  address?: string;
  contactEmail?: string;
  contactPhone?: string;
  description?: string;
  website?: string;
  /** Billing / admin gate: principals, teachers, parents lose Firestore access when not `active` (callable `adminSetSchoolSuspended`). */
  subscriptionStatus?: SubscriptionStatus;
  /** Per-feature enable/disable. Super Admin configures. */
  features?: SchoolFeatures;
  createdAt: string;
  updatedAt: string;
}

export type SchoolDeletionJobStatus = 'pending' | 'processing' | 'completed' | 'cancelled' | 'failed';

/** Queue entry for wiping a school after the cooling-off period (`adminQueueSchoolDeletion`). */
export interface SchoolDeletionJob {
  id: string;
  schoolId: string;
  schoolName: string;
  status: SchoolDeletionJobStatus;
  requestedAt: string;
  scheduledDeleteAt: string;
  requestedByUid: string;
  requestedByEmail?: string | null;
  startedAt?: string;
  resolvedAt?: string;
  cancelledByUid?: string;
  errorMessage?: string;
}

export type InviteRole = 'principal' | 'teacher';

export interface InviteToken {
  id: string;
  token: string;
  schoolId?: string;
  createdSchoolId?: string;
  schoolName?: string;
  principalName?: string;
  logoUrl?: string;
  email: string;
  role: InviteRole;
  expiresAt: string; // ISO
  usedAt?: string; // ISO
  createdAt: string; // ISO
}
/** Class/room within a school (e.g. Rainbow Room). Age range in months. */
export interface ClassRoom {
  id: string;
  schoolId: string;
  name: string;
  /** Minimum age in months. Display as years when 2 yr+ (≥24 mo). */
  minAgeMonths?: number | null;
  /** Maximum age in months. Display as years when 2 yr+ (≥24 mo). */
  maxAgeMonths?: number | null;
  assignedTeacherId?: string;
  createdAt: string;
  updatedAt: string;
}
