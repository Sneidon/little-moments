import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { getOrCreateChat } from '../api/chat';
import type { RootStackParamList } from '../navigation/MainTabs';

type OpenChatParams = {
  schoolId: string | null | undefined;
  childId: string;
  otherParticipantId: string | null | undefined;
  missingTitle: string;
  missingMessage: string;
};

export function useOpenChat({ replace = false }: { replace?: boolean } = {}) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [openingChildId, setOpeningChildId] = useState<string | null>(null);

  const openChat = useCallback(
    async ({ schoolId, childId, otherParticipantId, missingTitle, missingMessage }: OpenChatParams) => {
      if (!schoolId || !otherParticipantId) {
        Alert.alert(missingTitle, missingMessage);
        return;
      }
      setOpeningChildId(childId);
      try {
        const chat = await getOrCreateChat(schoolId, childId, otherParticipantId);
        const params = { chatId: chat.chatId, schoolId: chat.schoolId };
        if (replace) navigation.replace('ChatThread', params);
        else navigation.navigate('ChatThread', params);
      } catch {
        Alert.alert('Error', 'Could not open the conversation. Please try again.');
      } finally {
        setOpeningChildId(null);
      }
    },
    [navigation, replace]
  );

  return { openChat, openingChildId };
}

export const NO_PARENTS_ALERT = {
  missingTitle: 'No parents',
  missingMessage: 'This child has no linked parents.',
};

export const NO_TEACHER_ALERT = {
  missingTitle: 'No teacher assigned',
  missingMessage: 'This child does not have an assigned teacher yet.',
};
