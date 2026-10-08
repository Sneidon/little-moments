import type { ParentApprovalStatus } from './onboarding';

export type UserRole = 'teacher' | 'parent' | 'principal' | 'super_admin';

/** Notification preferences for parents. */
export interface NotificationPreferences {
  nappyChange?: boolean;
  napTime?: boolean;
  meal?: boolean;
  checkIn?: boolean;
  checkOut?: boolean;
  activity?: boolean;
  medication?: boolean;
  incident?: boolean;
  media?: boolean;
  /** Teacher–parent chat messages. */
  messages?: boolean;
  announcements?: boolean;
  events?: boolean;
  eventReminders?: boolean;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  preferredName?: string;
  /** Last name (especially for parents). */
  lastName?: string;
  /** Contact phone (especially for parents). */
  phone?: string;
  photoURL?: string;
  /** All roles this account holds. Missing on legacy docs — treat as [role]. */
  roles?: UserRole[];
  /** Active portal role (drives Auth claims + client routing). */
  role: UserRole;
  /** Parent approval gate. When not ACTIVE, parents should not access content. */
  parentStatus?: ParentApprovalStatus;
  whatsappOptIn?: boolean;
  /** If false, user is inactive (principal can reactivate teachers/parents). Default true. */
  isActive?: boolean;
  schoolId?: string; // teachers, principals
  fcmTokens?: string[];
  /** Parent notification preferences. All default true when undefined. */
  notificationPreferences?: NotificationPreferences;
  createdAt: string;
  updatedAt: string;
}
