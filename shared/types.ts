/**
 * Shared types for My Little Moments (mobile + web + functions).
 * Mirrors Firestore data model from Architecture Proposal.
 */

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
  /** Profile picture URL. */
  photoURL?: string;
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

export type ChildGender = 'male' | 'female' | 'other' | 'prefer_not_to_say';

export interface Child {
  id: string;
  schoolId: string;
  name: string;
  preferredName?: string;
  dateOfBirth: string; // ISO date
  gender?: ChildGender;
  allergies?: string[];
  /** Profile picture URL. */
  photoURL?: string;
  medicalNotes?: string;
  enrollmentDate?: string; // ISO date
  assignedTeacherId?: string;
  classId?: string; // room/class (e.g. Rainbow Room)
  parentIds: string[];
  emergencyContact?: string;
  emergencyContactName?: string;
  /** When false, child has left the school — excluded from class rosters and parent app. Default true when omitted. */
  isActive?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ReportType =
  | 'nappy_change'
  | 'meal'
  | 'nap_time'
  | 'check_in'
  | 'check_out'
  | 'activity'
  | 'medication'
  | 'incident'
  /** System-generated when a child is assigned to or moved between classes. */
  | 'class_change'
  /** System-generated for the class teacher when a child joins their class. */
  | 'child_joined_class';

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
  /** Selected meal option (from principal's list). */
  mealOptionId?: string;
  mealOptionName?: string;
  /** How much the child ate: none | little | half | most | all */
  mealAmount?: string;
  incidentDetails?: string;
  medicationName?: string;
  /** Dosage administered (for medication reports). */
  medicationDosage?: string;
  /** URL of photo/video uploaded to Storage (for photo/incident/media reports). */
  imageUrl?: string;
  /** True if media is for whole class (all parents in class get notified). */
  forWholeClass?: boolean;
  /** MIME type: image/* or video/*. */
  mediaType?: string;
  /** Teacher-selected label for photo posts (e.g. Outdoor play). */
  photoCategory?: string;
  /** Set on class_change reports when a child moves between classes. */
  previousClassId?: string;
  newClassId?: string;
}

/** Daily real-time communication: planned activity for the day, sent to all parents. */
export interface DailyCommunication {
  id: string;
  schoolId: string;
  classId: string;
  /** Teacher uid. */
  createdBy: string;
  /** Planned activity / communication text. */
  message: string;
  date: string; // ISO date YYYY-MM-DD
  createdAt: string;
}

export interface Announcement {
  id: string;
  schoolId: string;
  title: string;
  body: string;
  /** Optional image URL (uploaded to Storage). */
  imageUrl?: string;
  /** Optional document uploads (label + URL). */
  documents?: EventDocumentLink[];
  /** Optional manual links (label + URL). */
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
  /** Optional image URL (uploaded to Storage). */
  imageUrl?: string;
  /** Optional document links (name + URL). */
  documents?: EventDocumentLink[];
  /** Optional manual links (label + URL). */
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
  /** Principal uid once invite is accepted. */
  principalUid?: string;
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

export type QRCodeMode = 'WEB_FORM' | 'WHATSAPP_DEEP_LINK';
export type QRSource = 'POSTER' | 'WHATSAPP' | 'EMAIL' | 'OPEN_DAY';

export interface QRCode {
  id: string;
  schoolId: string;
  schoolSlug: string;
  classId?: string | null;
  childId?: string | null;
  inviteUrl: string;
  imageUrl: string;
  mode: QRCodeMode;
  source?: QRSource;
  expiresAt?: string | null; // ISO
  maxRegistrations?: number | null;
  scanCount: number;
  registrationCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export type ScanOutcome = 'SCANNED' | 'REGISTERED' | 'ABANDONED';

export interface QRScanLog {
  id: string;
  qrCodeId: string;
  schoolId: string;
  scannedAt: string; // ISO
  ipHash?: string | null;
  outcome: ScanOutcome;
}

export type ParentApprovalStatus = 'PENDING_APPROVAL' | 'ACTIVE' | 'REJECTED';

export interface PendingRegistration {
  id: string;
  schoolId: string;
  classId: string;
  teacherId: string;
  parentUid: string;
  childId: string;
  qrCodeId: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejectionReason?: string | null;
  createdAt: string;
  decidedAt?: string;
}

export interface JoinSession {
  id: string;
  schoolId: string;
  schoolSlug: string;
  qrCodeId: string;
  expiresAt: string; // ISO
  usedAt?: string; // ISO
  createdAt: string; // ISO
}

export type AnalyticsEventType =
  | 'qr_scanned'
  | 'join_session_created'
  | 'registration_step_completed'
  | 'registration_completed'
  | 'registration_abandoned'
  | 'first_photo_viewed';

export interface AnalyticsEvent {
  id: string;
  type: AnalyticsEventType;
  createdAt: string;
  schoolId?: string;
  qrCodeId?: string;
  joinSessionId?: string;
  registrationId?: string;
  userId?: string;
  step?: 1 | 2 | 3 | 4;
  props?: Record<string, unknown>;
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
  /** Uid of who sent the last message (for unread badges). */
  lastMessageSenderId?: string;
  /** When the teacher last opened this thread (ISO). */
  teacherLastReadAt?: string;
  /** When the parent last opened this thread (ISO). */
  parentLastReadAt?: string;
}

/** Single message in a chat thread. */
export interface ChatMessage {
  id: string;
  senderId: string;
  text: string;
  createdAt: string;
}

/** App session for usage analytics (time spent). */
export interface AppSession {
  id: string;
  userId: string;
  schoolId?: string;
  role: UserRole;
  /** Session start (ISO). */
  startedAt: string;
  /** Session end (ISO). */
  endedAt: string;
  /** Duration in seconds. */
  durationSeconds: number;
}
