/**
 * Shared types for My Little Moments (mobile + web + functions).
 * Mirrors Firestore data model from Architecture Proposal.
 */

export type UserRole = 'teacher' | 'parent' | 'principal' | 'super_admin';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  preferredName?: string;
  /** Contact phone (especially for parents). */
  phone?: string;
  role: UserRole;
  /** If false, user is inactive (principal can reactivate teachers/parents). Default true. */
  isActive?: boolean;
  schoolId?: string; // teachers, principals
  fcmTokens?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Child {
  id: string;
  schoolId: string;
  name: string;
  preferredName?: string;
  dateOfBirth: string; // ISO date
  allergies?: string[];
  medicalNotes?: string;
  enrollmentDate?: string; // ISO date
  assignedTeacherId?: string;
  classId?: string; // room/class (e.g. Rainbow Room)
  parentIds: string[];
  emergencyContact?: string;
  emergencyContactName?: string;
  createdAt: string;
  updatedAt: string;
}

export type ReportType = 'nappy_change' | 'meal' | 'nap_time' | 'medication' | 'incident';

export interface DailyReport {
  id: string;
  childId: string;
  schoolId: string;
  type: ReportType;
  reportedBy: string; // teacher uid
  notes?: string;
  timestamp: string; // ISO
  createdAt: string;
  // type-specific fields
  mealType?: 'breakfast' | 'lunch' | 'snack';
  incidentDetails?: string;
  medicationName?: string;
  /** URL of photo uploaded to Storage (for photo/incident reports). */
  imageUrl?: string;
}

export interface Announcement {
  id: string;
  schoolId: string;
  title: string;
  body: string;
  createdBy: string;
  createdAt: string;
  targetRole?: UserRole; // optional filter
}

export interface Event {
  id: string;
  schoolId: string;
  title: string;
  description?: string;
  startAt: string;
  endAt?: string;
  createdBy: string;
  createdAt: string;
  parentResponses?: Record<string, 'accepted' | 'declined'>;
}

export interface FoodMenu {
  id: string;
  schoolId: string;
  weekStart: string; // ISO date (Monday)
  breakfast: string[];
  lunch: string[];
  snack: string[];
  updatedAt: string;
}

export type SubscriptionStatus = 'active' | 'suspended';

export interface School {
  id: string;
  name: string;
  address?: string;
  contactEmail?: string;
  contactPhone?: string;
  description?: string;
  website?: string;
  subscriptionStatus?: SubscriptionStatus;
  createdAt: string;
  updatedAt: string;
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

/** Teacher–parent chat thread (one per teacher + parent + child). */
export interface Chat {
  id: string;
  schoolId: string;
  teacherId: string;
  parentId: string;
  childId: string;
  createdAt: string;
  updatedAt: string;
  /** Preview of last message for list UI. */
  lastMessageText?: string;
  lastMessageAt?: string;
}

/** Single message in a chat thread. */
export interface ChatMessage {
  id: string;
  senderId: string;
  text: string;
  createdAt: string;
}
