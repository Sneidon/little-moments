import type { UserRole } from './users';

/** Teacher–parent chat thread (one per teacher + parent + child). */
export interface Chat {
  id: string;
  schoolId: string;
  teacherId: string;
  parentId: string;
  childId: string;
  createdAt: string;
  updatedAt: string;
  lastMessageText?: string;
  lastMessageAt?: string;
  /** Uid of who sent the last message (for unread badges). */
  lastMessageSenderId?: string;
  /** When the teacher last opened this thread (ISO). */
  teacherLastReadAt?: string;
  /** When the parent last opened this thread (ISO). */
  parentLastReadAt?: string;
}

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
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
}
