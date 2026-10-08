export type ChildGender = 'male' | 'female' | 'other' | 'prefer_not_to_say';

export interface Child {
  id: string;
  schoolId: string;
  name: string;
  preferredName?: string;
  dateOfBirth: string; // ISO date
  gender?: ChildGender;
  allergies?: string[];
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
  createdBy: string;
  message: string;
  date: string; // ISO date YYYY-MM-DD
  createdAt: string;
}
