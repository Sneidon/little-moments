import type { Chat } from '../../../shared/types';
import type { UserRole } from '../../../shared/types';

export function getChatReadField(role: UserRole): 'teacherLastReadAt' | 'parentLastReadAt' {
  return role === 'teacher' ? 'teacherLastReadAt' : 'parentLastReadAt';
}

/** True when the other participant sent messages after this user last read the thread. */
export function isChatUnreadForUser(chat: Chat, uid: string, role: UserRole): boolean {
  if (!chat.lastMessageAt) return false;

  const readAt = role === 'teacher' ? chat.teacherLastReadAt : chat.parentLastReadAt;
  if (readAt && chat.lastMessageAt <= readAt) return false;

  if (chat.lastMessageSenderId) {
    return chat.lastMessageSenderId !== uid;
  }

  return !readAt;
}

export function formatTabBadgeCount(count: number): number | string | undefined {
  if (count <= 0) return undefined;
  return count > 99 ? '99+' : count;
}
