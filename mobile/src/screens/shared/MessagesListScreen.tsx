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
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
import { brandFont } from '../../theme/typography';
import { NotificationBellButton } from '../../components/NotificationBellButton';
import { HeaderBlock, Overline, DisplayTitle } from '../../components/brand/HeaderBlock';
import { PrimaryButton, OutlineButton } from '../../components/brand/Buttons';
import { BrandSkeletonStudentCard } from '../../components/brand/BrandSkeletons';
import {
  avatarCategoryColor,
  NATIVE_TAB_BAR_CLEARANCE_IOS,
  radius,
  spacing,
  type as typeTokens,
  type BrandPalette,
  type CategoryPalette,
} from '../../theme/tokens';
import { getInitials } from '../../utils';
import { isChatUnreadForUser } from '../../utils/chatUnread';
import type { Chat } from '../../../../shared/types';
import type { UserProfile } from '../../../../shared/types';
import type { Child } from '../../../../shared/types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

export type MessagesStackParamList = {
  MessagesList: undefined;
  ChatThread: { chatId: string; schoolId: string; otherDisplayName?: string };
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
  const { profile, loading: authLoading } = useAuth();
  const { colors, brand, category } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(brand, category), [brand, category]);
  const tabBarClearance = Platform.OS === 'ios' ? insets.bottom + NATIVE_TAB_BAR_CLEARANCE_IOS : 24;
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
    if (authLoading) return;

    const uid = profile?.uid;
    const schoolId = profile?.schoolId;
    const role = profile?.role;
    if (!uid) {
      setLoading(false);
      return;
    }

    if (role === 'teacher' && !schoolId) {
      setLoading(false);
      return;
    }

    setLoading(true);

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
        if (snap.empty && snap.metadata.fromCache) {
          return;
        }
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
  }, [authLoading, profile?.uid, profile?.schoolId, profile?.role, refreshTrigger]);

  const unreadCount = useMemo(
    () =>
      profile?.uid && profile.role
        ? chats.filter((c) => isChatUnreadForUser(c, profile.uid, profile.role)).length
        : 0,
    [chats, profile?.uid, profile?.role]
  );

  const header = (
    <HeaderBlock style={styles.header}>
      <View style={styles.headerRow}>
        <View style={styles.headerTitles}>
          <Overline>{unreadCount > 0 ? `${unreadCount} unread` : 'Inbox'}</Overline>
          <DisplayTitle>Messages</DisplayTitle>
        </View>
        <NotificationBellButton
          variant="header"
          colors={colors}
          onPress={() => rootNav?.navigate('UserNotifications')}
        />
      </View>
    </HeaderBlock>
  );

  const actions =
    profile?.role === 'teacher' ? (
      <View style={styles.actionsRow}>
        <PrimaryButton
          label="Message class"
          icon="megaphone-outline"
          size="s"
          style={styles.actionBtn}
          onPress={() => rootNav?.navigate('BroadcastToClass')}
          accessibilityLabel="Message all parents in a class"
        />
        <OutlineButton
          label="New chat"
          icon="chatbubble-ellipses-outline"
          size="s"
          style={styles.actionBtn}
          onPress={() => rootNav?.navigate('SelectChildToMessage')}
          accessibilityLabel="Start a new chat"
        />
      </View>
    ) : profile?.role === 'parent' ? (
      <View style={styles.actionsRow}>
        <PrimaryButton
          label="Message teacher"
          icon="person-outline"
          size="s"
          style={styles.actionBtn}
          onPress={() => rootNav?.navigate('ParentSelectChildToMessage')}
        />
      </View>
    ) : null;

  const listHeader = (
    <>
      {header}
      {actions}
      {chats.length > 0 ? (
        <Text style={styles.sectionTitle} accessibilityRole="header">
          Conversations
        </Text>
      ) : null}
    </>
  );

  const openChat = useCallback(
    (item: ChatWithNames) => {
      rootNav?.navigate('ChatThread', {
        chatId: item.id,
        schoolId: item.schoolId,
        otherDisplayName: item.otherDisplayName,
      });
    },
    [rootNav]
  );

  const renderItem = useCallback(
    ({ item, index }: { item: ChatWithNames; index: number }) => {
      const initials = getInitials(item.otherDisplayName === '…' ? '?' : item.otherDisplayName);
      const preview = item.lastMessageText?.trim();
      const timeLabel = formatListTime(item.lastMessageAt || item.updatedAt);
      const unread =
        profile?.uid && profile.role
          ? isChatUnreadForUser(item, profile.uid, profile.role)
          : false;

      return (
        <TouchableOpacity
          style={[styles.rowCard, unread && styles.rowCardUnread]}
          onPress={() => openChat(item)}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={`${item.otherDisplayName}, about ${item.childName}${unread ? ', unread' : ''}. ${
            preview || 'No messages yet'
          }`}
        >
          <View style={[styles.avatar, { backgroundColor: avatarCategoryColor(category, index) }]}>
            <Text style={styles.avatarText}>{initials}</Text>
            {unread ? <View style={styles.unreadDot} /> : null}
          </View>
          <View style={styles.rowBody}>
            <View style={styles.rowTop}>
              <Text style={styles.name} numberOfLines={1}>
                {item.otherDisplayName}
              </Text>
              {timeLabel ? (
                <Text style={[styles.time, unread && styles.timeUnread]}>{timeLabel}</Text>
              ) : null}
            </View>
            <View style={styles.childRow}>
              <Ionicons name="happy-outline" size={14} color={brand.textSecondary} />
              <Text style={styles.childName} numberOfLines={1}>
                {item.childName}
              </Text>
            </View>
            <Text
              style={preview ? [styles.preview, unread && styles.previewUnread] : styles.previewEmpty}
              numberOfLines={2}
            >
              {preview || 'No messages yet'}
            </Text>
          </View>
        </TouchableOpacity>
      );
    },
    [brand, category, openChat, profile?.role, profile?.uid, styles]
  );

  if (authLoading || loading) {
    return (
      <View style={styles.container} accessibilityState={{ busy: true }}>
        <View style={{ paddingHorizontal: spacing.screenX }}>{header}</View>
        <View style={styles.loadingBlock}>
          {[1, 2, 3, 4, 5].map((i) => (
            <BrandSkeletonStudentCard key={i} compact />
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
        ListHeaderComponent={listHeader}
        ItemSeparatorComponent={() => <View style={{ height: spacing.gapS + 2 }} />}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={brand.onHeader}
            colors={[brand.headerBackground]}
          />
        }
        contentContainerStyle={[styles.listContent, { paddingBottom: tabBarClearance }]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="chatbubbles-outline" size={28} color={category.onCategory} />
            </View>
            <Text style={styles.emptyTitle}>No conversations yet</Text>
            <Text style={styles.emptyBody}>
              {profile?.role === 'teacher'
                ? 'Use Message class or New chat above to reach parents.'
                : 'Tap Message teacher above to start a conversation.'}
            </Text>
          </View>
        }
      />
    </View>
  );
}

function createStyles(brand: BrandPalette, category: CategoryPalette) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: brand.background },
    header: { marginHorizontal: -spacing.screenX },
    headerRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 },
    headerTitles: { flex: 1, gap: 6 },
    listContent: { flexGrow: 1, paddingHorizontal: spacing.screenX },
    loadingBlock: { padding: spacing.screenX, gap: spacing.gapS + 2 },
    actionsRow: { flexDirection: 'row', gap: 10, marginTop: spacing.gapL },
    actionBtn: { flex: 1 },
    sectionTitle: { ...typeTokens.section, color: brand.textPrimary, marginTop: 24, marginBottom: 12, marginHorizontal: 4 },
    rowCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      padding: 14,
      borderRadius: radius.card,
      backgroundColor: brand.surface,
      borderWidth: 2.5,
      borderColor: brand.surface,
    },
    rowCardUnread: { borderColor: brand.textPrimary },
    avatar: {
      width: 52,
      height: 52,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: { fontFamily: brandFont.display800, fontSize: 20, color: category.onCategory },
    unreadDot: {
      position: 'absolute',
      right: -4,
      top: -4,
      width: 18,
      height: 18,
      borderRadius: 9,
      borderWidth: 3,
      borderColor: brand.surface,
      backgroundColor: category.photo,
    },
    rowBody: { flex: 1, minWidth: 0, gap: 3 },
    rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    name: { flex: 1, fontFamily: brandFont.display800, fontSize: 18, letterSpacing: -0.36, color: brand.textPrimary },
    time: { fontFamily: brandFont.body600, fontSize: 12, color: brand.textTertiary, flexShrink: 0 },
    timeUnread: { fontFamily: brandFont.body800, color: brand.textPrimary },
    childRow: { flexDirection: 'row', alignItems: 'center', gap: 4, maxWidth: '100%' },
    childName: { flex: 1, fontFamily: brandFont.body700, fontSize: 13, color: brand.textSecondary },
    preview: { fontFamily: brandFont.body500, fontSize: 14, lineHeight: 20, color: brand.textSecondary },
    previewUnread: { fontFamily: brandFont.body700, color: brand.textPrimary },
    previewEmpty: { fontFamily: brandFont.body500, fontSize: 14, lineHeight: 20, fontStyle: 'italic', color: brand.textTertiary },
    emptyCard: {
      marginTop: spacing.gapL,
      backgroundColor: brand.surface,
      borderRadius: radius.card,
      paddingVertical: 28,
      paddingHorizontal: 24,
      alignItems: 'center',
      gap: 10,
    },
    emptyIconWrap: {
      width: 56,
      height: 56,
      borderRadius: 18,
      backgroundColor: category.nap,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 4,
    },
    emptyTitle: { ...typeTokens.cardTitle, color: brand.textPrimary, textAlign: 'center' },
    emptyBody: { ...typeTokens.body, color: brand.textSecondary, textAlign: 'center', maxWidth: 280 },
  });
}
