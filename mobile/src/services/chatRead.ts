import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { getChatReadField } from '../utils/chatUnread';
import type { UserRole } from '../../../shared/types';

export async function markChatRead(
  schoolId: string,
  chatId: string,
  role: UserRole,
  readAt?: string
): Promise<void> {
  if (role !== 'teacher' && role !== 'parent') return;
  const field = getChatReadField(role);
  const at = readAt ?? new Date().toISOString();
  try {
    await updateDoc(doc(db, 'schools', schoolId, 'chats', chatId), { [field]: at });
  } catch (error) {
    console.warn('Failed to mark chat read:', error);
  }
}
