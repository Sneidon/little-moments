import { useCallback, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { markChatRead } from '../../services/chatRead';
import type { ChatMessage, UserRole } from '@shared/types';

export function useMarkChatRead(schoolId: string, chatId: string, role: UserRole | undefined, uid: string | undefined, recent: ChatMessage[]) {
  const chatRole = role === 'teacher' || role === 'parent' ? role : null;

  useFocusEffect(
    useCallback(() => {
      if (chatRole) void markChatRead(schoolId, chatId, chatRole);
    }, [schoolId, chatId, chatRole])
  );

  useEffect(() => {
    const latest = recent[recent.length - 1];
    if (!chatRole || !uid || !latest || latest.senderId === uid) return;
    void markChatRead(schoolId, chatId, chatRole, latest.createdAt);
  }, [recent, schoolId, chatId, chatRole, uid]);
}
