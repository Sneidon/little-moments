import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Platform,
} from 'react-native';
import { SkeletonMessageListRow, SkeletonMessagesActionHeader } from '../../components/Skeleton';
import { EmptyState } from '../../components/EmptyState';
import { Ionicons } from '@expo/vector-icons';
import {
  collection,
  collectionGroup,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  getDoc,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { font } from '../../theme/typography';
import { getInitials } from '../../utils';
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

function formatListTime(iso: string | undefined): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    const now = new Date();
    const startToday = new Date(now);
    startToday.setHours(0, 0, 0, 0);
    const startYesterday = new Date(startToday);
    startYesterday.setDate(startYesterday.getDate() - 1);
    const startMsg = new Date(d);
    startMsg.setHours(0, 0, 0, 0);

    if (startMsg.getTime() === startToday.getTime()) {
      return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    }
    if (startMsg.getTime() === startYesterday.getTime()) return 'Yesterday';

    const weekAgo = new Date(startToday);
    weekAgo.setDate(weekAgo.getDate() - 6);
    if (startMsg >= weekAgo) {
      return d.toLocaleDateString(undefined, { weekday: 'short' });
    }
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

export function MessagesListScreen({ navigation }: Props) {
  const { profile } = useAuth();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const [chats, setChats] = useState<ChatWithNames[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const rootNav = navigation.getParent() as
    | { navigate: (name: string, params?: object) => void }
    | undefined;

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setRefreshTrigger((t) => t + 1);
  }, []);

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

    const unsub = onSnapshot(
      q,
      async (snap) => {
        try {
          const list: Chat[] = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Chat));
          const withNames: ChatWithNames[] = await Promise.all(
            list.map(async (c) => {
              const otherUid = role === 'teacher' ? c.parentId : c.teacherId;
              let otherDisplayName = '…';
              let childName = '…';
              try {
                const userSnap = await getDoc(doc(db, 'users', otherUid));
                if (userSnap.exists()) {
                  otherDisplayName =
                    (userSnap.data() as UserProfile).displayName || otherUid.slice(0, 8);
                }
              } catch {
                /* ignore */
              }
              try {
                const childSnap = await getDoc(doc(db, 'schools', c.schoolId, 'children', c.childId));
                if (childSnap.exists()) {
                  childName = (childSnap.data() as Child).name || 'Child';
                }
              } catch {
                /* ignore */
              }
              return {
                ...c,
                otherDisplayName,
                childName,
              };
            })
          );
          setChats(withNames);
        } catch (e) {
          console.error('Messages process error:', e);
          setChats([]);
        }
        setLoading(false);
        setRefreshing(false);
      },
      (err) => {
        console.error('Messages snapshot error:', err);
        setChats([]);
        setLoading(false);
        setRefreshing(false);
      }
    );

    return () => unsub();
  }, [profile?.uid, profile?.schoolId, profile?.role, refreshTrigger]);

  const renderListHeader = () => {
    if (profile?.role === 'teacher') {
      return (
        <View style={styles.headerActions}>
          <View style={styles.headerActionsRow}>
            <TouchableOpacity
              onPress={() => rootNav?.navigate('BroadcastToClass')}
              style={styles.actionPill}
              accessibilityRole="button"
              accessibilityLabel="Message all parents in a class"
              activeOpacity={0.85}
            >
              <Ionicons name="megaphone-outline" size={20} color={colors.primary} />
              <Text style={styles.actionPillText}>Message class</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => rootNav?.navigate('SelectChildToMessage')}
              style={styles.actionPill}
              accessibilityRole="button"
              accessibilityLabel="Start a new chat"
              activeOpacity={0.85}
            >
              <Ionicons name="chatbubble-ellipses-outline" size={20} color={colors.primary} />
              <Text style={styles.actionPillText}>New chat</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }
    if (profile?.role === 'parent') {
      return (
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => rootNav?.navigate('ParentSelectChildToMessage')}
            style={[styles.actionPill, styles.actionPillFull]}
            accessibilityRole="button"
            accessibilityLabel="Message teacher"
            activeOpacity={0.85}
          >
            <Ionicons name="person-outline" size={20} color={colors.primary} />
            <Text style={[styles.actionPillText, styles.actionPillTextGrow]}>Message teacher</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      );
    }
    return null;
  };

  const openChat = useCallback(
    (item: ChatWithNames) => {
      rootNav?.navigate('ChatThread', { chatId: item.id, schoolId: item.schoolId });
    },
    [rootNav]
  );

  const renderItem = useCallback(
    ({ item }: { item: ChatWithNames }) => {
      const initials = getInitials(item.otherDisplayName === '…' ? '?' : item.otherDisplayName);
      const preview = item.lastMessageText?.trim();
      const timeLabel = formatListTime(item.lastMessageAt || item.updatedAt);

      const cardShadow =
        !isDark && Platform.OS === 'ios'
          ? {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.06,
              shadowRadius: 4,
            }
          : {};
      const cardElevation = !isDark && Platform.OS === 'android' ? { elevation: 2 } : {};

      return (
        <TouchableOpacity
          style={[styles.rowCard, cardShadow, cardElevation]}
          onPress={() => openChat(item)}
          activeOpacity={0.72}
        >
          <View style={[styles.avatar, { backgroundColor: colors.avatarBg }]}>
            <Text style={[styles.avatarText, { color: colors.avatarText }]}>{initials}</Text>
          </View>
          <View style={styles.rowBody}>
            <View style={styles.rowTop}>
              <Text style={styles.name} numberOfLines={1}>
                {item.otherDisplayName}
              </Text>
              {timeLabel ? <Text style={styles.time}>{timeLabel}</Text> : null}
            </View>
            <View style={styles.childRow}>
              <Ionicons name="happy-outline" size={14} color={colors.textMuted} />
              <Text style={styles.childName} numberOfLines={1}>
                {item.childName}
              </Text>
            </View>
            <Text style={preview ? styles.preview : styles.previewEmpty} numberOfLines={2}>
              {preview || 'No messages yet'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} style={styles.rowChevron} />
        </TouchableOpacity>
      );
    },
    [colors, isDark, openChat, styles]
  );

  const skeletonStyle = useMemo(
    () => ({
      marginHorizontal: 16,
      marginBottom: 10,
    }),
    []
  );

  const skeletonHeaderVariant =
    profile?.role === 'teacher' ? 'teacher' : profile?.role === 'parent' ? 'parent' : 'none';

  if (loading) {
    return (
      <View style={styles.container} accessibilityState={{ busy: true }}>
        <SkeletonMessagesActionHeader variant={skeletonHeaderVariant} />
        <View style={styles.loadingBlock}>
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <SkeletonMessageListRow key={i} style={skeletonStyle} />
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={chats}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListHeaderComponent={renderListHeader}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            icon="chatbubbles-outline"
            title="No conversations yet"
            subtitle={
              profile?.role === 'teacher'
                ? 'Use Message class or New chat above to reach parents.'
                : 'Tap Message teacher above to start a conversation.'
            }
          />
        }
      />
    </View>
  );
}

function createStyles(colors: import('../../theme/colors').ColorPalette, isDark: boolean) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.backgroundSecondary },
    listContent: {
      flexGrow: 1,
      paddingTop: 4,
      paddingBottom: 28,
    },
    loadingBlock: {
      paddingTop: 4,
    },
    headerActions: {
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 8,
    },
    headerActionsRow: {
      flexDirection: 'row',
      gap: 10,
    },
    actionPill: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 12,
      paddingHorizontal: 12,
      borderRadius: 14,
      backgroundColor: colors.card,
      borderWidth: isDark ? StyleSheet.hairlineWidth : 0,
      borderColor: colors.cardBorder,
    },
    actionPillFull: {
      width: '100%',
      justifyContent: 'flex-start',
      paddingHorizontal: 16,
    },
    actionPillText: {
      fontFamily: font.semiBold,
      fontSize: 15,
      color: colors.primary,
      flexShrink: 1,
    },
    actionPillTextGrow: {
      flex: 1,
      marginLeft: 4,
    },
    rowCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      marginHorizontal: 16,
      marginBottom: 10,
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderRadius: 14,
      borderWidth: isDark ? StyleSheet.hairlineWidth : 0,
      borderColor: colors.cardBorder,
    },
    avatar: {
      width: 52,
      height: 52,
      borderRadius: 26,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    avatarText: {
      fontFamily: font.semiBold,
      fontSize: 17,
    },
    rowBody: {
      flex: 1,
      minWidth: 0,
    },
    rowTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    name: {
      flex: 1,
      fontFamily: font.semiBold,
      fontSize: 16,
      color: colors.text,
    },
    time: {
      fontFamily: font.regular,
      fontSize: 12,
      color: colors.textMuted,
      flexShrink: 0,
    },
    childRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: 4,
      maxWidth: '100%',
    },
    childName: {
      fontFamily: font.medium,
      fontSize: 12,
      color: colors.textMuted,
      flex: 1,
    },
    preview: {
      fontFamily: font.regular,
      fontSize: 14,
      lineHeight: 19,
      color: colors.textSecondary,
      marginTop: 6,
    },
    previewEmpty: {
      fontFamily: font.regular,
      fontSize: 14,
      lineHeight: 19,
      color: colors.textMuted,
      fontStyle: 'italic',
      marginTop: 6,
    },
    rowChevron: {
      marginLeft: 4,
      opacity: 0.65,
    },
  });
}
