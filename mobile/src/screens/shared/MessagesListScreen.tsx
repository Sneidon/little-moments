import React, { useEffect, useState, useLayoutEffect, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, collectionGroup, query, where, orderBy, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import type { Chat } from '../../../../shared/types';
import type { UserProfile } from '../../../../shared/types';
import type { Child } from '../../../../shared/types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

export type MessagesStackParamList = {
  MessagesList: undefined;
  ChatThread: { chatId: string; schoolId: string };
  SelectChildToMessage: undefined;
};

type Props = NativeStackScreenProps<MessagesStackParamList, 'MessagesList'>;

type ChatWithNames = Chat & {
  otherDisplayName: string;
  childName: string;
};

function formatMessageTime(iso: string | undefined): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    const now = new Date();
    const sameDay =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear();
    if (sameDay) {
      return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    }
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

export function MessagesListScreen({ navigation }: Props) {
  const { profile } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [chats, setChats] = useState<ChatWithNames[]>([]);
  const [loading, setLoading] = useState(true);

  useLayoutEffect(() => {
    if (profile?.role === 'teacher') {
      navigation.setOptions({
        headerRight: () => (
          <TouchableOpacity
            onPress={() => (navigation.getParent() as { navigate: (name: string) => void } | undefined)?.navigate('SelectChildToMessage')}
            style={styles.headerBtn}
          >
            <Text style={styles.headerBtnText}>New chat</Text>
          </TouchableOpacity>
        ),
      });
    }
  }, [navigation, profile?.role]);

  useEffect(() => {
    const uid = profile?.uid;
    const schoolId = profile?.schoolId;
    const role = profile?.role;
    if (!uid) return;

    if (role === 'teacher' && !schoolId) {
      setLoading(false);
      return;
    }

    const q =
      role === 'teacher'
        ? query(
            collection(db, 'schools', schoolId!, 'chats'),
            where('teacherId', '==', uid),
            orderBy('updatedAt', 'desc')
          )
        : query(
            collectionGroup(db, 'chats'),
            where('parentId', '==', uid),
            orderBy('updatedAt', 'desc')
          );

    const unsub = onSnapshot(q, async (snap) => {
      const list: Chat[] = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Chat));
      const withNames: ChatWithNames[] = await Promise.all(
        list.map(async (c) => {
          const otherUid = role === 'teacher' ? c.parentId : c.teacherId;
          let otherDisplayName = '…';
          let childName = '…';
          try {
            const userSnap = await getDoc(doc(db, 'users', otherUid));
            if (userSnap.exists()) {
              otherDisplayName = (userSnap.data() as UserProfile).displayName || otherUid.slice(0, 8);
            }
          } catch {}
          try {
            const childSnap = await getDoc(
              doc(db, 'schools', c.schoolId, 'children', c.childId)
            );
            if (childSnap.exists()) {
              childName = (childSnap.data() as Child).name || 'Child';
            }
          } catch {}
          return {
            ...c,
            otherDisplayName,
            childName,
          };
        })
      );
      setChats(withNames);
      setLoading(false);
    });

    return () => unsub();
  }, [profile?.uid, profile?.schoolId, profile?.role]);

  const renderItem = ({ item }: { item: ChatWithNames }) => (
    <TouchableOpacity
      style={styles.row}
      onPress={() => (navigation.getParent() as { navigate: (name: string, params: { chatId: string; schoolId: string }) => void } | undefined)?.navigate('ChatThread', { chatId: item.id, schoolId: item.schoolId })}
      activeOpacity={0.7}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {item.otherDisplayName
            .trim()
            .split(/\s+/)
            .map((s) => s[0])
            .slice(0, 2)
            .join('')
            .toUpperCase() || '?'}
        </Text>
      </View>
      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={1}>
          {item.otherDisplayName}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {item.childName}
        </Text>
        {item.lastMessageText ? (
          <Text style={styles.preview} numberOfLines={1}>
            {item.lastMessageText}
          </Text>
        ) : null}
      </View>
      <Text style={styles.time}>{formatMessageTime(item.lastMessageAt || item.updatedAt)}</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={chats}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="chatbubbles-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No conversations yet</Text>
            <Text style={styles.emptySubtitle}>
              {profile?.role === 'teacher'
                ? 'Tap "New chat" above to message a parent, or open a child\'s report and tap "Message parents".'
                : 'Start a conversation from your child\'s profile by tapping "Message teacher".'}
            </Text>
          </View>
        }
      />
    </View>
  );
}

function createStyles(colors: import('../../theme/colors').ColorPalette) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    avatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    avatarText: { fontSize: 18, fontWeight: '600', color: colors.primaryContrast },
    content: { flex: 1, minWidth: 0 },
    name: { fontSize: 16, fontWeight: '600', color: colors.text },
    subtitle: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
    preview: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
    time: { fontSize: 12, color: colors.textMuted, marginLeft: 8 },
    empty: {
      padding: 32,
      alignItems: 'center',
    },
    emptyTitle: { fontSize: 18, fontWeight: '600', color: colors.textMuted, marginTop: 16 },
    emptySubtitle: { fontSize: 14, color: colors.textMuted, marginTop: 8, textAlign: 'center' },
    headerBtn: { paddingHorizontal: 12, paddingVertical: 8 },
    headerBtnText: { color: colors.primary, fontWeight: '600', fontSize: 16 },
  });
}
