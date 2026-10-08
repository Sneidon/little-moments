import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, View } from 'react-native';
import { KeyboardAvoider, keyboardScrollProps } from '../../components/KeyboardAvoider';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { sendChatMessage } from '../../api/chat';
import { getInitials } from '../../utils';
import { getChatReadField } from '../../utils/chatUnread';
import { ChatComposer } from '../../features/chat/ChatComposer';
import { ChatEmpty } from '../../features/chat/ChatEmpty';
import { ChatMessageRow } from '../../features/chat/ChatMessageRow';
import { buildChatListItems, type ChatListItem } from '../../features/chat/messageList';
import { useChatMessages } from '../../features/chat/useChatMessages';
import { useChatPartner } from '../../features/chat/useChatPartner';
import { useMarkChatRead } from '../../features/chat/useMarkChatRead';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'ChatThread'>;

export function ChatThreadScreen({ route, navigation }: Props) {
  const { chatId, schoolId } = route.params;
  const { profile } = useAuth();
  const { brand } = useTheme();
  const { messages, recent, loadingInitial, loadingOlder, loadOlder } = useChatMessages(schoolId, chatId);
  const partnerName = useChatPartner(schoolId, chatId, profile?.role, route.params.otherDisplayName);
  useMarkChatRead(schoolId, chatId, profile?.role, profile?.uid, recent);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList<ChatListItem>>(null);
  const didInitialScroll = useRef(false);
  const scrollAfterSend = useRef(false);
  const items = useMemo(() => buildChatListItems(messages, profile?.uid), [messages, profile?.uid]);
  const partnerInitials = getInitials(partnerName);

  useLayoutEffect(() => navigation.setOptions({ title: partnerName }), [navigation, partnerName]);

  useEffect(() => {
    if (messages.length === 0 || didInitialScroll.current) return;
    didInitialScroll.current = true;
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: false }));
  }, [messages.length]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || !profile?.uid || sending) return;
    setSending(true);
    setInput('');
    scrollAfterSend.current = true;
    try {
      const readField = profile.role === 'teacher' || profile.role === 'parent' ? getChatReadField(profile.role) : null;
      await sendChatMessage(schoolId, chatId, profile.uid, text, readField);
    } catch {
      setInput(text);
      scrollAfterSend.current = false;
    } finally {
      setSending(false);
    }
  }, [input, profile?.uid, profile?.role, sending, schoolId, chatId]);

  const renderItem = useCallback(
    ({ item }: { item: ChatListItem }) => (
      <ChatMessageRow item={item} myUid={profile?.uid} partnerName={partnerName} partnerInitials={partnerInitials} />
    ),
    [profile?.uid, partnerName, partnerInitials]
  );

  return (
    <KeyboardAvoider style={{ backgroundColor: brand.background }}>
      <FlatList
        ref={listRef}
        data={items}
        keyExtractor={(item) => (item.type === 'date' ? item.id : item.message.id)}
        renderItem={renderItem}
        contentContainerStyle={[{ paddingHorizontal: 12, paddingVertical: 8, flexGrow: 1 }, items.length === 0 && { justifyContent: 'center' }]}
        ListEmptyComponent={<ChatEmpty loading={loadingInitial} />}
        ListHeaderComponent={loadingOlder ? <View style={{ paddingVertical: 12 }}><ActivityIndicator size="small" color={brand.textPrimary} /></View> : null}
        {...keyboardScrollProps}
        onStartReached={() => void loadOlder()}
        onStartReachedThreshold={0.15}
        maintainVisibleContentPosition={items.length > 0 ? { minIndexForVisible: 0, autoscrollToTopThreshold: 24 } : undefined}
        onContentSizeChange={() => {
          if (!scrollAfterSend.current) return;
          scrollAfterSend.current = false;
          listRef.current?.scrollToEnd({ animated: true });
        }}
        showsVerticalScrollIndicator={false}
      />
      <ChatComposer value={input} onChange={setInput} onSend={send} sending={sending} />
    </KeyboardAvoider>
  );
}
