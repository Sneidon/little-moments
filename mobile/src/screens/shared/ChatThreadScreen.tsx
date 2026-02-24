import React, { useEffect, useState, useRef, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { collection, doc, addDoc, updateDoc, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import type { ChatMessage } from '../../../../shared/types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MessagesStackParamList } from './MessagesListScreen';

type Props = NativeStackScreenProps<MessagesStackParamList, 'ChatThread'>;

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

export function ChatThreadScreen({ route }: Props) {
  const { chatId, schoolId } = route.params;
  const { profile } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    const q = query(
      collection(db, 'schools', schoolId, 'chats', chatId, 'messages'),
      orderBy('createdAt', 'asc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setMessages(
        snap.docs.map((d) => ({ id: d.id, ...d.data() } as ChatMessage))
      );
    });
    return () => unsub();
  }, [schoolId, chatId]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || !profile?.uid || sending) return;

    setSending(true);
    setInput('');
    try {
      const messagesRef = collection(db, 'schools', schoolId, 'chats', chatId, 'messages');
      const chatRef = doc(db, 'schools', schoolId, 'chats', chatId);
      const now = new Date().toISOString();
      await addDoc(messagesRef, {
        senderId: profile.uid,
        text,
        createdAt: now,
      });
      await updateDoc(chatRef, {
        lastMessageText: text.slice(0, 100),
        lastMessageAt: now,
        updatedAt: now,
      });
    } catch (e) {
      setInput(text);
    } finally {
      setSending(false);
    }
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isMe = item.senderId === profile?.uid;
    return (
      <View style={[styles.bubbleWrap, isMe ? styles.bubbleWrapRight : styles.bubbleWrapLeft]}>
        <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
          <Text style={[styles.bubbleText, isMe ? styles.bubbleTextMe : styles.bubbleTextThem]}>
            {item.text}
          </Text>
          <Text style={[styles.bubbleTime, isMe ? styles.bubbleTimeMe : styles.bubbleTimeThem]}>
            {formatTime(item.createdAt)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.listContent}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Type a message…"
          placeholderTextColor={colors.textMuted}
          value={input}
          onChangeText={setInput}
          multiline
          maxLength={2000}
          editable={!sending}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!input.trim() || sending) && styles.sendBtnDisabled]}
          onPress={sendMessage}
          disabled={!input.trim() || sending}
        >
          <Text style={styles.sendBtnText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

function createStyles(colors: import('../../theme/colors').ColorPalette) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.backgroundSecondary },
    listContent: { padding: 12, paddingBottom: 8 },
    bubbleWrap: { marginBottom: 8 },
    bubbleWrapLeft: { alignItems: 'flex-start' },
    bubbleWrapRight: { alignItems: 'flex-end' },
    bubble: {
      maxWidth: '80%',
      padding: 12,
      borderRadius: 16,
    },
    bubbleMe: {
      backgroundColor: colors.primary,
      borderBottomRightRadius: 4,
    },
    bubbleThem: {
      backgroundColor: colors.border,
      borderBottomLeftRadius: 4,
    },
    bubbleText: { fontSize: 15 },
    bubbleTextMe: { color: colors.primaryContrast },
    bubbleTextThem: { color: colors.text },
    bubbleTime: { fontSize: 11, marginTop: 4 },
    bubbleTimeMe: { color: 'rgba(255,255,255,0.8)' },
    bubbleTimeThem: { color: colors.textMuted },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      padding: 12,
      paddingBottom: Platform.OS === 'ios' ? 24 : 12,
      backgroundColor: colors.card,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    input: {
      flex: 1,
      minHeight: 40,
      maxHeight: 100,
      backgroundColor: colors.backgroundSecondary,
      borderRadius: 20,
      paddingHorizontal: 16,
      paddingVertical: 10,
      fontSize: 16,
      color: colors.text,
      marginRight: 8,
    },
    sendBtn: {
      backgroundColor: colors.primary,
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 20,
      justifyContent: 'center',
    },
    sendBtnDisabled: { opacity: 0.5 },
    sendBtnText: { color: colors.primaryContrast, fontWeight: '600', fontSize: 15 },
  });
}
