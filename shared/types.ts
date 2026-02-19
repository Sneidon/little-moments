/**
 * Shared types for My Little Moments (mobile + web + functions).
 * Mirrors Firestore data model from Architecture Proposal.
 */

export type UserRole = 'teacher' | 'parent' | 'principal' | 'super_admin';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  schoolId?: string; // teachers, principals
  fcmTokens?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Child {
  id: string;
  schoolId: string;
  name: string;
  dateOfBirth: string; // ISO date
  allergies?: string[];
  assignedTeacherId?: string;
  classId?: string; // room/class (e.g. Rainbow Room)
  parentIds: string[];
  emergencyContact?: string;
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

export interface School {
  id: string;
  name: string;
  address?: string;
  contactEmail?: string;
  contactPhone?: string;
  createdAt: string;
  updatedAt: string;
}

/** Class/room within a school (e.g. Rainbow Room). */
export interface ClassRoom {
  id: string;
  schoolId: string;
  name: string;
  assignedTeacherId?: string;
  createdAt: string;
  updatedAt: string;
}
