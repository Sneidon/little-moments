import type { UserRole } from './users';

export interface Announcement {
  id: string;
  schoolId: string;
  title: string;
  body: string;
  /** Optional image or video URL (uploaded to Storage). */
  imageUrl?: string;
  /** MIME category for `imageUrl`: image or video. */
  mediaType?: string;
  documents?: EventDocumentLink[];
  links?: EventDocumentLink[];
  createdBy: string;
  createdAt: string;
  /** Who sees this: everyone or specific classes. */
  targetType?: 'everyone' | 'classes';
  /** Class IDs when targetType is 'classes'. */
  targetClassIds?: string[];
  /** Teacher IDs when targeting by teacher (distributes to parents of that teacher's class). */
  targetTeacherIds?: string[];
  targetRole?: UserRole; // optional filter (legacy)
  /** Set by Cloud Function when reminder notification has been sent. */
  reminderSentAt?: string;
}

/** A document link shown on an event; optional label for display. */
export interface EventDocumentLink {
  /** Optional display label (e.g. "Permission slip", "Programme"). */
  label?: string;
  /** Fallback name/title if no label. */
  name?: string;
  url: string;
}

export interface Event {
  id: string;
  schoolId: string;
  title: string;
  description?: string;
  /** Optional image or video URL (uploaded to Storage). */
  imageUrl?: string;
  /** MIME category for `imageUrl`: image or video. */
  mediaType?: string;
  documents?: EventDocumentLink[];
  links?: EventDocumentLink[];
  startAt: string;
  endAt?: string;
  createdBy: string;
  createdAt: string;
  /** Who sees this: everyone or specific classes. */
  targetType?: 'everyone' | 'classes';
  /** Class IDs when targetType is 'classes'. */
  targetClassIds?: string[];
  parentResponses?: Record<string, 'accepted' | 'declined'>;
}

/** A single meal option (breakfast, lunch, or snack) defined by the principal for teachers to select when logging meals. */
export interface MealOption {
  id: string;
  schoolId: string;
  category: 'breakfast' | 'lunch' | 'snack';
  name: string;
  description: string;
  imageUrl?: string;
  order?: number;
  createdAt: string;
  updatedAt: string;
}

/** Weekly food menu: items per day. Monday=0, Sunday=6. */
export interface FoodMenuWeekly {
  id: string;
  schoolId: string;
  /** ISO date of Monday for this week. */
  weekStart: string;
  /** dayIndex 0=Mon..6=Sun, category breakfast|lunch|snack, value = meal option names/IDs. */
  days: Record<string, Record<'breakfast' | 'lunch' | 'snack', string[]>>;
  updatedAt: string;
}

/** @deprecated Use meal options (MealOption) per category instead. Kept for migration. */
export interface FoodMenu {
  id: string;
  schoolId: string;
  weekStart: string; // ISO date (Monday)
  breakfast: string[];
  lunch: string[];
  snack: string[];
  updatedAt: string;
}
