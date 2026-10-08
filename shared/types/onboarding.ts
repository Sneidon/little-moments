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
