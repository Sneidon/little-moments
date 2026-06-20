import React, { useEffect, useState, useRef, useMemo, useCallback, useLayoutEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  query,
  orderBy,
  limit,
  startAfter,
  onSnapshot,
  getDoc,
  getDocs,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { font } from '../../theme/typography';
import { getInitials } from '../../utils';
import { markChatRead } from '../../services/chatRead';
import { getChatReadField } from '../../utils/chatUnread';
import type { RootStackParamList } from '../../navigation/MainTabs';
import type { ChatMessage, Chat, UserProfile } from '../../../../shared/types';

type Props = NativeStackScreenProps<RootStackParamList, 'ChatThread'>;

/** Recent messages kept in real time; older pages load on scroll up. */
const RECENT_PAGE_SIZE = 40;
const OLDER_PAGE_SIZE = 40;

const GROUP_GAP_MS = 5 * 60 * 1000;
const AVATAR_COL_WIDTH = 36;
const AVATAR_SIZE = 32;

type ListItem =
  | { type: 'date'; id: string; label: string }
  | {
      type: 'message';
      message: ChatMessage;
      isFirstInGroup: boolean;
      isLastInGroup: boolean;
      showSenderName: boolean;
      showAvatar: boolean;
    };

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

function getLocalDayKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDateDividerLabel(iso: string): string {
  const d = new Date(iso);
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);
  const startOfMsg = new Date(d);
  startOfMsg.setHours(0, 0, 0, 0);
  if (startOfMsg.getTime() === startOfToday.getTime()) return 'Today';
  if (startOfMsg.getTime() === startOfYesterday.getTime()) return 'Yesterday';
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
}

function shouldStartNewGroup(prev: ChatMessage | undefined, curr: ChatMessage): boolean {
  if (!prev) return true;
  if (prev.senderId !== curr.senderId) return true;
  const t1 = new Date(prev.createdAt).getTime();
  const t2 = new Date(curr.createdAt).getTime();
  if (Number.isNaN(t1) || Number.isNaN(t2)) return true;
  return t2 - t1 > GROUP_GAP_MS;
}

function bubbleRadii(
  isMe: boolean,
  isFirstInGroup: boolean,
  isLastInGroup: boolean
): Pick<
  import('react-native').ViewStyle,
  | 'borderTopLeftRadius'
  | 'borderTopRightRadius'
  | 'borderBottomLeftRadius'
  | 'borderBottomRightRadius'
> {
  const big = 20;
  const sm = 5;
  if (isMe) {
    return {
      borderTopLeftRadius: big,
      borderTopRightRadius: isFirstInGroup ? big : sm,
      borderBottomLeftRadius: big,
      borderBottomRightRadius: isLastInGroup ? big : sm,
    };
  }
  return {
    borderTopLeftRadius: isFirstInGroup ? big : sm,
    borderTopRightRadius: big,
    borderBottomLeftRadius: isLastInGroup ? big : sm,
    borderBottomRightRadius: big,
  };
}

function MessageAvatar({
  initials,
  backgroundColor,
  textColor,
  size = AVATAR_SIZE,
}: {
  initials: string;
  backgroundColor: string;
  textColor: string;
  size?: number;
}) {
  const r = size / 2;
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: r,
        backgroundColor,
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <Text style={{ fontFamily: font.bold, fontSize: size > 34 ? 13 : 11, color: textColor }} numberOfLines={1}>
        {initials}
      </Text>
    </View>
  );
}

function buildListItems(messages: ChatMessage[], myUid: string | undefined): ListItem[] {
  const items: ListItem[] = [];
  let lastDayKey = '';

  for (let i = 0; i < messages.length; i++) {
    const m = messages[i];
    const dk = getLocalDayKey(m.createdAt);
    if (dk !== lastDayKey) {
      items.push({ type: 'date', id: `date-${dk}`, label: formatDateDividerLabel(m.createdAt) });
      lastDayKey = dk;
    }

    const prev = messages[i - 1];
    const next = messages[i + 1];
    const isFirstInGroup = shouldStartNewGroup(prev, m);
    const isLastInGroup = !next || shouldStartNewGroup(m, next);
    const isMe = m.senderId === myUid;

    items.push({
      type: 'message',
      message: m,
      isFirstInGroup,
      isLastInGroup,
      showSenderName: !isMe && isFirstInGroup,
      showAvatar: !isMe && isLastInGroup,
    });
  }

  return items;
}

function docToChatMessage(d: QueryDocumentSnapshot): ChatMessage {
  const data = d.data();
  let createdAt = data.createdAt;
  if (createdAt && typeof (createdAt as { toDate?: () => Date }).toDate === 'function') {
    createdAt = (createdAt as { toDate: () => Date }).toDate().toISOString();
  } else if (typeof createdAt !== 'string') {
    createdAt = String(createdAt ?? '');
  }
  return { id: d.id, ...data, createdAt } as ChatMessage;
}

function mergeMessagesByIdAsc(a: ChatMessage[], b: ChatMessage[]): ChatMessage[] {
  const map = new Map<string, ChatMessage>();
  for (const m of a) map.set(m.id, m);
  for (const m of b) map.set(m.id, m);
  return Array.from(map.values()).sort((x, y) => x.createdAt.localeCompare(y.createdAt));
}

export function ChatThreadScreen({ route, navigation }: Props) {
  const { chatId, schoolId } = route.params;
  const { profile } = useAuth();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const themed = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  /** Paginated history (strictly older than the live sliding window). */
  const [extraOlder, setExtraOlder] = useState<ChatMessage[]>([]);
  /** Newest-first query window, stored ascending for rendering. */
  const [liveRecent, setLiveRecent] = useState<ChatMessage[]>([]);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMoreOlder, setHasMoreOlder] = useState(true);
  const liveOldestSnapRef = useRef<QueryDocumentSnapshot | null>(null);
  const nextOlderCursorRef = useRef<QueryDocumentSnapshot | null>(null);
  const prevLiveRecentRef = useRef<ChatMessage[]>([]);
  const loadOlderInFlightRef = useRef(false);
  const didInitialScrollRef = useRef(false);
  const stickToBottomAfterSendRef = useRef(false);

  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const defaultOtherLabel = profile?.role === 'parent' ? 'Daycare staff' : 'Parent';
  const initialOtherLabel = route.params.otherDisplayName?.trim() || defaultOtherLabel;
  const [otherLabel, setOtherLabel] = useState(initialOtherLabel);
  const [otherInitials, setOtherInitials] = useState(() => getInitials(initialOtherLabel));
  const flatListRef = useRef<FlatList<ListItem>>(null);

  const messages = useMemo(() => mergeMessagesByIdAsc(extraOlder, liveRecent), [extraOlder, liveRecent]);

  const listData = useMemo(
    () => buildListItems(messages, profile?.uid),
    [messages, profile?.uid]
  );

  const composerBottomPad = Math.max(insets.bottom, 10);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const chatSnap = await getDoc(doc(db, 'schools', schoolId, 'chats', chatId));
        if (!chatSnap.exists() || cancelled) return;
        const data = chatSnap.data() as Chat;
        const otherUid = profile?.role === 'teacher' ? data.parentId : data.teacherId;
        const u = await getDoc(doc(db, 'users', otherUid));
        if (cancelled) return;
        const userData = u.data() as UserProfile | undefined;
        const dn = userData?.preferredName?.trim() || userData?.displayName?.trim();
        if (dn) {
          setOtherLabel(dn);
          setOtherInitials(getInitials(dn));
        } else {
          const fallback = profile?.role === 'parent' ? 'Daycare staff' : 'Parent';
          setOtherLabel(fallback);
          setOtherInitials(getInitials(fallback));
        }
      } catch {
        /* keep defaults */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [schoolId, chatId, profile?.role, profile?.uid]);

  useLayoutEffect(() => {
    navigation.setOptions({ title: otherLabel });
  }, [navigation, otherLabel]);

  useFocusEffect(
    useCallback(() => {
      const role = profile?.role;
      if (role !== 'teacher' && role !== 'parent') return;
      void markChatRead(schoolId, chatId, role);
    }, [schoolId, chatId, profile?.role])
  );

  useEffect(() => {
    const role = profile?.role;
    const uid = profile?.uid;
    if (!uid || (role !== 'teacher' && role !== 'parent') || liveRecent.length === 0) return;
    const latest = liveRecent[liveRecent.length - 1];
    if (latest.senderId === uid) return;
    void markChatRead(schoolId, chatId, role, latest.createdAt);
  }, [liveRecent, schoolId, chatId, profile?.role, profile?.uid]);

  useEffect(() => {
    setExtraOlder([]);
    setLiveRecent([]);
    setHasMoreOlder(true);
    liveOldestSnapRef.current = null;
    nextOlderCursorRef.current = null;
    prevLiveRecentRef.current = [];
    loadOlderInFlightRef.current = false;
    didInitialScrollRef.current = false;
  }, [schoolId, chatId]);

  useEffect(() => {
    const col = collection(db, 'schools', schoolId, 'chats', chatId, 'messages');
    const q = query(col, orderBy('createdAt', 'desc'), limit(RECENT_PAGE_SIZE));
    const unsub = onSnapshot(q, (snap) => {
      if (snap.empty) {
        setLiveRecent([]);
        liveOldestSnapRef.current = null;
        setHasMoreOlder(false);
        prevLiveRecentRef.current = [];
        return;
      }
      liveOldestSnapRef.current = snap.docs[snap.docs.length - 1] ?? null;
      const asc = [...snap.docs].reverse().map(docToChatMessage);
      const prev = prevLiveRecentRef.current;
      if (prev.length > 0) {
        const nextIds = new Set(asc.map((m) => m.id));
        const evicted = prev.filter((m) => !nextIds.has(m.id));
        if (evicted.length > 0) {
          setExtraOlder((p) => mergeMessagesByIdAsc(p, evicted));
        }
      }
      prevLiveRecentRef.current = asc;
      setLiveRecent(asc);
      if (snap.docs.length < RECENT_PAGE_SIZE) {
        setHasMoreOlder(false);
      } else {
        setHasMoreOlder(true);
      }
    });
    return () => unsub();
  }, [schoolId, chatId]);

  useEffect(() => {
    if (messages.length === 0 || didInitialScrollRef.current) return;
    didInitialScrollRef.current = true;
    requestAnimationFrame(() => {
      flatListRef.current?.scrollToEnd({ animated: false });
    });
  }, [messages.length]);

  const loadOlderMessages = useCallback(async () => {
    if (loadOlderInFlightRef.current || loadingOlder || !hasMoreOlder) return;
    const col = collection(db, 'schools', schoolId, 'chats', chatId, 'messages');
    const cursor = nextOlderCursorRef.current ?? liveOldestSnapRef.current;
    if (!cursor) {
      setHasMoreOlder(false);
      return;
    }
    loadOlderInFlightRef.current = true;
    setLoadingOlder(true);
    try {
      const q = query(col, orderBy('createdAt', 'desc'), startAfter(cursor), limit(OLDER_PAGE_SIZE));
      const snap = await getDocs(q);
      if (snap.empty) {
        setHasMoreOlder(false);
        return;
      }
      const batchAsc = [...snap.docs].reverse().map(docToChatMessage);
      setExtraOlder((prev) => mergeMessagesByIdAsc(prev, batchAsc));
      nextOlderCursorRef.current = snap.docs[snap.docs.length - 1] ?? null;
      if (snap.docs.length < OLDER_PAGE_SIZE) {
        setHasMoreOlder(false);
      }
    } finally {
      setLoadingOlder(false);
      loadOlderInFlightRef.current = false;
    }
  }, [schoolId, chatId, hasMoreOlder, loadingOlder]);

  const onStartReached = useCallback(() => {
    void loadOlderMessages();
  }, [loadOlderMessages]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || !profile?.uid || sending) return;

    setSending(true);
    setInput('');
    stickToBottomAfterSendRef.current = true;
    try {
      const messagesRef = collection(db, 'schools', schoolId, 'chats', chatId, 'messages');
      const chatRef = doc(db, 'schools', schoolId, 'chats', chatId);
      const now = new Date().toISOString();
      await addDoc(messagesRef, {
        senderId: profile.uid,
        text,
        createdAt: now,
      });
      const readField =
        profile.role === 'teacher' || profile.role === 'parent'
          ? getChatReadField(profile.role)
          : null;
      await updateDoc(chatRef, {
        lastMessageText: text.slice(0, 100),
        lastMessageAt: now,
        lastMessageSenderId: profile.uid,
        updatedAt: now,
        ...(readField ? { [readField]: now } : {}),
      });
    } catch {
      setInput(text);
      stickToBottomAfterSendRef.current = false;
    } finally {
      setSending(false);
    }
  };

  const renderItem = useCallback(
    ({ item }: { item: ListItem }) => {
      if (item.type === 'date') {
        return (
          <View style={themed.dateWrap}>
            <View style={themed.datePill}>
              <Text style={themed.datePillText}>{item.label}</Text>
            </View>
          </View>
        );
      }

      const { message, isFirstInGroup, isLastInGroup, showSenderName, showAvatar } = item;
      const isMe = message.senderId === profile?.uid;

      const bubbleShadow =
        !isDark && Platform.OS === 'ios'
          ? {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.06,
              shadowRadius: 3,
            }
          : {};
      const bubbleElevation = !isDark && Platform.OS === 'android' ? { elevation: 1 } : {};

      const marginBottom = isLastInGroup ? 12 : 3;

      const bubble = (
        <View
          style={[
            themed.bubble,
            isMe ? themed.bubbleMe : themed.bubbleThem,
            bubbleRadii(isMe, isFirstInGroup, isLastInGroup),
            bubbleShadow,
            bubbleElevation,
          ]}
        >
          <Text style={[themed.bubbleText, isMe ? themed.bubbleTextMe : themed.bubbleTextThem]}>
            {message.text}
          </Text>
          {isLastInGroup ? (
            <Text style={[themed.bubbleTime, isMe ? themed.bubbleTimeMe : themed.bubbleTimeThem]}>
              {formatTime(message.createdAt)}
            </Text>
          ) : null}
        </View>
      );

      if (isMe) {
        return (
          <View style={[themed.rowMe, { marginBottom }]}>
            <View style={themed.colMe}>{bubble}</View>
          </View>
        );
      }

      return (
        <View style={[themed.rowThem, { marginBottom }]}>
          <View style={themed.avatarColumn}>
            {showAvatar ? (
              <MessageAvatar
                initials={otherInitials}
                backgroundColor={colors.avatarBg}
                textColor={colors.avatarText}
                size={AVATAR_SIZE}
              />
            ) : null}
          </View>
          <View style={themed.colThem}>
            {showSenderName ? (
              <Text style={themed.senderLabel} numberOfLines={1}>
                {otherLabel}
              </Text>
            ) : null}
            {bubble}
          </View>
        </View>
      );
    },
    [profile?.uid, themed, colors.avatarBg, colors.avatarText, isDark, otherInitials, otherLabel]
  );

  const keyExtractor = useCallback((item: ListItem) => {
    if (item.type === 'date') return item.id;
    return item.message.id;
  }, []);

  const listEmpty = useMemo(
    () => (
      <View style={themed.emptyWrap}>
        <View style={themed.emptyIconCircle}>
          <Ionicons name="chatbubbles-outline" size={36} color={colors.textMuted} />
        </View>
        <Text style={themed.emptyTitle}>No messages yet</Text>
        <Text style={themed.emptySubtitle}>Say hello to start the conversation.</Text>
      </View>
    ),
    [themed, colors.textMuted]
  );

  return (
    <KeyboardAvoidingView
      style={themed.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <FlatList
          ref={flatListRef}
          data={listData}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          contentContainerStyle={[
            themed.listContent,
            listData.length === 0 && themed.listContentEmpty,
          ]}
          ListEmptyComponent={listEmpty}
          ListHeaderComponent={
            loadingOlder ? (
              <View style={themed.topLoader}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : null
          }
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          onStartReached={onStartReached}
          onStartReachedThreshold={0.15}
          maintainVisibleContentPosition={
            listData.length > 0
              ? {
                  minIndexForVisible: 0,
                  autoscrollToTopThreshold: 24,
                }
              : undefined
          }
          onContentSizeChange={() => {
            if (stickToBottomAfterSendRef.current) {
              stickToBottomAfterSendRef.current = false;
              flatListRef.current?.scrollToEnd({ animated: true });
            }
          }}
          showsVerticalScrollIndicator={false}
        />
        <View style={[themed.inputRow, { paddingBottom: composerBottomPad }]}>
          <TextInput
            style={themed.input}
            placeholder="Message"
            placeholderTextColor={colors.textMuted}
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={2000}
            editable={!sending}
          />
          <TouchableOpacity
            style={[
              themed.sendBtnCircle,
              (!input.trim() || sending) && themed.sendBtnCircleDisabled,
            ]}
            onPress={sendMessage}
            disabled={!input.trim() || sending}
            accessibilityLabel="Send message"
            accessibilityRole="button"
          >
            {sending ? (
              <ActivityIndicator size="small" color={colors.primaryContrast} />
            ) : (
              <Ionicons name="send" size={20} color={colors.primaryContrast} />
            )}
          </TouchableOpacity>
        </View>
    </KeyboardAvoidingView>
  );
}

function createStyles(colors: import('../../theme/colors').ColorPalette, isDark: boolean) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.backgroundSecondary },
    listContent: {
      paddingHorizontal: 12,
      paddingTop: 8,
      paddingBottom: 8,
      flexGrow: 1,
    },
    listContentEmpty: {
      justifyContent: 'center',
      flexGrow: 1,
    },
    topLoader: {
      paddingVertical: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dateWrap: {
      alignItems: 'center',
      marginVertical: 14,
    },
    datePill: {
      paddingHorizontal: 14,
      paddingVertical: 5,
      borderRadius: 14,
      backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
      maxWidth: '90%',
    },
    datePillText: {
      fontFamily: font.medium,
      fontSize: 12,
      color: colors.textMuted,
      textAlign: 'center',
    },
    emptyWrap: {
      alignSelf: 'center',
      alignItems: 'center',
      paddingHorizontal: 32,
      paddingVertical: 48,
    },
    emptyIconCircle: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    emptyTitle: {
      fontFamily: font.semiBold,
      fontSize: 17,
      color: colors.text,
      marginBottom: 6,
      textAlign: 'center',
    },
    emptySubtitle: {
      fontFamily: font.regular,
      fontSize: 15,
      lineHeight: 21,
      color: colors.textMuted,
      textAlign: 'center',
    },
    rowThem: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      maxWidth: '100%',
    },
    avatarColumn: {
      width: AVATAR_COL_WIDTH,
      alignItems: 'center',
      justifyContent: 'flex-end',
      paddingBottom: 2,
    },
    rowMe: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'flex-end',
      maxWidth: '100%',
    },
    colThem: {
      marginLeft: 6,
      maxWidth: '80%',
      alignItems: 'flex-start',
    },
    colMe: {
      maxWidth: '80%',
      alignItems: 'flex-end',
    },
    senderLabel: {
      fontFamily: font.medium,
      fontSize: 12,
      color: colors.textMuted,
      marginBottom: 4,
      marginLeft: 2,
      maxWidth: '100%',
    },
    bubble: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      paddingBottom: 8,
      maxWidth: '100%',
    },
    bubbleMe: {
      backgroundColor: colors.primary,
    },
    bubbleThem: {
      backgroundColor: colors.card,
      borderWidth: isDark ? StyleSheet.hairlineWidth : 0,
      borderColor: colors.cardBorder,
    },
    bubbleText: {
      fontFamily: font.regular,
      fontSize: 16,
      lineHeight: 21,
    },
    bubbleTextMe: { color: colors.primaryContrast },
    bubbleTextThem: { color: colors.text },
    bubbleTime: {
      fontFamily: font.regular,
      fontSize: 11,
      marginTop: 4,
      alignSelf: 'flex-end',
    },
    bubbleTimeMe: { color: 'rgba(255,255,255,0.72)' },
    bubbleTimeThem: { color: colors.textMuted },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      paddingHorizontal: 12,
      paddingTop: 8,
      backgroundColor: colors.tabBarBg,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.cardBorder,
    },
    input: {
      flex: 1,
      minHeight: 40,
      maxHeight: 120,
      backgroundColor: colors.inputBackground,
      borderRadius: 22,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.inputBorder,
      paddingHorizontal: 16,
      paddingVertical: Platform.OS === 'ios' ? 10 : 9,
      fontFamily: font.regular,
      fontSize: 16,
      color: colors.text,
      marginRight: 8,
    },
    sendBtnCircle: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 0,
    },
    sendBtnCircleDisabled: {
      opacity: 0.45,
    },
  });
}
