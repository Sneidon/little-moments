import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { addDoc, collection, doc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { font } from '../../theme/typography';
import { getOrCreateChat } from '../../api/chat';
import { Skeleton } from '../../components/Skeleton';
import { EmptyState } from '../../components/EmptyState';
import type { Child } from '../../../../shared/types';
import type { ClassRoom } from '../../../../shared/types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/MainTabs';

type Props = NativeStackScreenProps<RootStackParamList, 'BroadcastToClass'>;

const MESSAGE_MAX = 2000;
/** Ask for confirmation when broadcasting to this many or more parents */
const CONFIRM_PARENT_THRESHOLD = 3;

function countUniqueParents(children: Child[]): number {
  const seen = new Set<string>();
  for (const child of children) {
    for (const parentId of child.parentIds ?? []) {
      seen.add(parentId);
    }
  }
  return seen.size;
}

function cardShadowStyle(isDark: boolean): object {
  if (isDark) return {};
  return Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.07,
      shadowRadius: 6,
    },
    android: { elevation: 2 },
    default: {},
  });
}

export function BroadcastToClassScreen({ navigation }: Props) {
  const { profile } = useAuth();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const shadow = useMemo(() => cardShadowStyle(isDark), [isDark]);

  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendPhase, setSendPhase] = useState<'idle' | 'chats' | 'messages'>('idle');
  const [recipientCount, setRecipientCount] = useState<number | null>(null);
  const [childrenInClass, setChildrenInClass] = useState<number | null>(null);
  const [countLoading, setCountLoading] = useState(false);
  const [countError, setCountError] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const schoolId = profile?.schoolId;
  const uid = profile?.uid;

  const loadClasses = useCallback(async () => {
    if (!schoolId || !uid) {
      setClasses([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }
    const classesSnap = await getDocs(collection(db, 'schools', schoolId, 'classes'));
    const myClasses = classesSnap.docs.filter(
      (d) => (d.data() as ClassRoom).assignedTeacherId === uid
    );
    const list = myClasses.map((d) => ({
      id: d.id,
      name: (d.data() as ClassRoom).name ?? d.id,
    }));
    list.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
    setClasses(list);
    setSelectedClassId((prev) => {
      if (list.length === 0) return null;
      if (list.length === 1) return list[0].id;
      if (prev && list.some((c) => c.id === prev)) return prev;
      return null;
    });
  }, [schoolId, uid]);

  useEffect(() => {
    if (!schoolId || !uid) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        await loadClasses();
      } finally {
        if (!cancelled) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [schoolId, uid, refreshTrigger, loadClasses]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setRefreshTrigger((t) => t + 1);
  }, []);

  useEffect(() => {
    if (!schoolId || !selectedClassId) {
      setRecipientCount(null);
      setChildrenInClass(null);
      setCountLoading(false);
      return;
    }
    let cancelled = false;
    setRecipientCount(null);
    setChildrenInClass(null);
    setCountError(false);
    setCountLoading(true);
    (async () => {
      try {
        const childrenSnap = await getDocs(
          query(
            collection(db, 'schools', schoolId, 'children'),
            where('classId', '==', selectedClassId)
          )
        );
        if (cancelled) return;
        const children = childrenSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Child));
        setChildrenInClass(children.length);
        setRecipientCount(countUniqueParents(children));
      } catch {
        if (!cancelled) {
          setRecipientCount(null);
          setChildrenInClass(null);
          setCountError(true);
        }
      } finally {
        if (!cancelled) setCountLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [schoolId, selectedClassId, refreshTrigger]);

  const runSend = useCallback(async () => {
    const text = message.trim();
    if (!text || !schoolId || !selectedClassId || !uid) return;

    setSending(true);
    setSendPhase('chats');
    try {
      const childrenSnap = await getDocs(
        query(
          collection(db, 'schools', schoolId, 'children'),
          where('classId', '==', selectedClassId)
        )
      );
      const children = childrenSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Child));
      const parentChildMap = new Map<string, string>();
      for (const child of children) {
        for (const parentId of child.parentIds ?? []) {
          if (!parentChildMap.has(parentId)) {
            parentChildMap.set(parentId, child.id);
          }
        }
      }
      if (parentChildMap.size === 0) {
        Alert.alert('No parents', 'No parents are linked to children in this class.');
        return;
      }
      const entries = Array.from(parentChildMap.entries());
      const results = await Promise.all(
        entries.map(([parentId, childId]) => getOrCreateChat(schoolId, childId, parentId))
      );
      setSendPhase('messages');
      const now = new Date().toISOString();
      await Promise.all(
        results.map(async (r) => {
          const messagesRef = collection(db, 'schools', r.schoolId, 'chats', r.chatId, 'messages');
          const chatRef = doc(db, 'schools', r.schoolId, 'chats', r.chatId);
          await addDoc(messagesRef, { senderId: uid, text, createdAt: now });
          await updateDoc(chatRef, {
            lastMessageText: text.slice(0, 100),
            lastMessageAt: now,
            updatedAt: now,
          });
        })
      );
      Alert.alert('Sent', `Your message was sent to ${results.length} parent${results.length === 1 ? '' : 's'}.`, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
      setMessage('');
    } catch {
      Alert.alert('Error', 'Could not send message. Please try again.');
    } finally {
      setSending(false);
      setSendPhase('idle');
    }
  }, [message, schoolId, selectedClassId, uid, navigation]);

  const onSendPress = useCallback(() => {
    const text = message.trim();
    if (!text || !selectedClassId || recipientCount === null || recipientCount === 0) return;

    if (recipientCount >= CONFIRM_PARENT_THRESHOLD) {
      Alert.alert(
        'Send class message?',
        `This will post the same message to ${recipientCount} separate parent chat${recipientCount === 1 ? '' : 's'}.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Send', style: 'default', onPress: () => void runSend() },
        ]
      );
      return;
    }
    void runSend();
  }, [message, selectedClassId, recipientCount, runSend]);

  const selectedClassName = useMemo(
    () => classes.find((c) => c.id === selectedClassId)?.name,
    [classes, selectedClassId]
  );

  const canSend =
    !!selectedClassId &&
    !!message.trim() &&
    !sending &&
    !countLoading &&
    !countError &&
    recipientCount !== null &&
    recipientCount > 0;

  const sendAccessibilityLabel = useMemo(() => {
    if (!selectedClassName) return 'Send message to class';
    const n = recipientCount ?? 0;
    return `Send message to ${n} parent${n === 1 ? '' : 's'} in ${selectedClassName}`;
  }, [selectedClassName, recipientCount]);

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingWrap]} accessibilityState={{ busy: true }}>
        <View style={styles.loadingInner}>
          <Skeleton width="36%" height={18} borderRadius={6} style={{ marginBottom: 16 }} />
          <View style={styles.skelChips}>
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} width={112} height={48} borderRadius={14} />
            ))}
          </View>
          <Skeleton width="52%" height={14} borderRadius={4} style={{ marginTop: 24, marginBottom: 10 }} />
          <Skeleton width="100%" height={140} borderRadius={16} />
          <Skeleton width="100%" height={52} borderRadius={14} style={{ marginTop: 16 }} />
        </View>
      </View>
    );
  }

  if (classes.length === 0) {
    return (
      <View style={styles.container}>
        <EmptyState
          icon="school-outline"
          title="No classes assigned"
          subtitle="When you’re assigned to a class, you can message all parents in that class from here."
        />
      </View>
    );
  }

  const bottomPad = Math.max(insets.bottom, 16);

  const recipientLine = countLoading
    ? 'Counting families…'
    : countError
      ? 'Couldn’t load roster. Pull down to retry.'
      : childrenInClass === null || recipientCount === null
        ? '—'
        : recipientCount === 0
          ? 'No linked parents in this class'
          : `${childrenInClass} ${childrenInClass === 1 ? 'child' : 'children'} · ${recipientCount} parent${recipientCount === 1 ? '' : 's'}`;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: bottomPad }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        <View style={[styles.heroCard, shadow]}>
          <View style={[styles.heroIconWrap, { backgroundColor: colors.primaryMuted }]}>
            <Ionicons name="megaphone-outline" size={26} color={colors.primary} />
          </View>
          <Text style={styles.heroTitle}>Class broadcast</Text>
          <Text style={styles.heroBody}>
            One message is copied into each family’s private chat with you — parents don’t see each other’s threads.
          </Text>
        </View>

        <Text style={styles.sectionLabel}>Class</Text>
        <View style={styles.classList}>
          {classes.map((c) => {
            const selected = selectedClassId === c.id;
            return (
              <TouchableOpacity
                key={c.id}
                style={[styles.classCard, shadow, selected && styles.classCardSelected, selected && { borderColor: colors.primary, backgroundColor: colors.primaryMuted }]}
                onPress={() => setSelectedClassId(c.id)}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={`Class ${c.name}`}
              >
                <Ionicons
                  name="school-outline"
                  size={22}
                  color={selected ? colors.primary : colors.textMuted}
                />
                <Text
                  style={[styles.classCardName, selected && { color: colors.primary, fontFamily: font.semiBold }]}
                  numberOfLines={2}
                >
                  {c.name}
                </Text>
                {selected ? (
                  <Ionicons name="checkmark-circle" size={22} color={colors.primary} style={styles.classCheck} />
                ) : null}
              </TouchableOpacity>
            );
          })}
        </View>

        {selectedClassId ? (
          <View
            style={[
              styles.recipientBar,
              (recipientCount === 0 || countError) && !countLoading && styles.recipientBarWarn,
            ]}
          >
            <Ionicons
              name={countError || (recipientCount === 0 && !countLoading) ? 'alert-circle-outline' : 'people-outline'}
              size={20}
              color={countError || (recipientCount === 0 && !countLoading) ? colors.warning : colors.primary}
            />
            <Text
              style={[
                styles.recipientText,
                recipientCount === 0 && !countLoading && { color: colors.textSecondary },
              ]}
            >
              {recipientLine}
            </Text>
          </View>
        ) : null}

        <Text style={styles.sectionLabel}>Message</Text>
        <TextInput
          style={[styles.input, shadow]}
          placeholder="Write something for parents…"
          placeholderTextColor={colors.textMuted}
          multiline
          maxLength={MESSAGE_MAX}
          value={message}
          onChangeText={setMessage}
          editable={!sending}
          textAlignVertical="top"
        />
        <View style={styles.charRow}>
          <Text style={styles.charHint}>Only you and each parent see their thread.</Text>
          <Text style={styles.charCount}>
            {message.length}/{MESSAGE_MAX}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.sendBtn, !canSend && styles.sendBtnDisabled]}
          onPress={onSendPress}
          disabled={!canSend}
          activeOpacity={0.88}
          accessibilityRole="button"
          accessibilityLabel={sendAccessibilityLabel}
        >
          {sending ? (
            <View style={styles.sendingRow}>
              <ActivityIndicator size="small" color={colors.primaryContrast} />
              <Text style={styles.sendingText}>
                {sendPhase === 'chats' ? 'Opening chats…' : 'Sending messages…'}
              </Text>
            </View>
          ) : (
            <>
              <Ionicons name="send" size={20} color={colors.primaryContrast} style={styles.sendIcon} />
              <Text style={styles.sendBtnText} numberOfLines={1}>
                Send{selectedClassName ? ` to ${selectedClassName}` : ''}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function createStyles(colors: import('../../theme/colors').ColorPalette, isDark: boolean) {
  return StyleSheet.create({
    flex: { flex: 1 },
    scroll: { flex: 1, backgroundColor: colors.backgroundSecondary },
    container: { flex: 1, backgroundColor: colors.backgroundSecondary },
    loadingWrap: { justifyContent: 'flex-start', paddingTop: 16 },
    loadingInner: { paddingHorizontal: 16 },
    skelChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    content: { paddingHorizontal: 16, paddingTop: 12 },
    heroCard: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 16,
      marginBottom: 20,
      borderWidth: isDark ? StyleSheet.hairlineWidth : 0,
      borderColor: colors.cardBorder,
      alignItems: 'center',
    },
    heroIconWrap: {
      width: 52,
      height: 52,
      borderRadius: 26,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
    },
    heroTitle: {
      fontFamily: font.semiBold,
      fontSize: 18,
      color: colors.text,
      marginBottom: 6,
      textAlign: 'center',
    },
    heroBody: {
      fontFamily: font.regular,
      fontSize: 14,
      lineHeight: 20,
      color: colors.textMuted,
      textAlign: 'center',
    },
    sectionLabel: {
      fontFamily: font.semiBold,
      fontSize: 13,
      color: colors.textMuted,
      marginBottom: 10,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    classList: { gap: 10, marginBottom: 14 },
    classCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderRadius: 14,
      paddingVertical: 14,
      paddingHorizontal: 14,
      borderWidth: isDark ? StyleSheet.hairlineWidth : 1,
      borderColor: colors.cardBorder,
      gap: 12,
    },
    classCardSelected: {
      borderWidth: 2,
    },
    classCardName: {
      flex: 1,
      fontFamily: font.medium,
      fontSize: 16,
      color: colors.text,
    },
    classCheck: { marginLeft: 4 },
    recipientBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderRadius: 12,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: 'transparent',
    },
    recipientBarWarn: {
      borderColor: colors.accentOrangeSoft,
      backgroundColor: isDark ? 'rgba(246, 173, 85, 0.1)' : colors.accentOrangeSoft,
    },
    recipientText: {
      flex: 1,
      fontFamily: font.medium,
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 20,
    },
    input: {
      backgroundColor: colors.inputBackground,
      borderWidth: isDark ? StyleSheet.hairlineWidth : 1,
      borderColor: colors.inputBorder,
      borderRadius: 16,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontFamily: font.regular,
      fontSize: 16,
      lineHeight: 22,
      color: colors.text,
      minHeight: 140,
    },
    charRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 12,
      marginTop: 8,
    },
    charHint: {
      flex: 1,
      fontFamily: font.regular,
      fontSize: 12,
      lineHeight: 17,
      color: colors.textMuted,
    },
    charCount: {
      fontFamily: font.regular,
      fontSize: 12,
      color: colors.textMuted,
    },
    sendBtn: {
      marginTop: 18,
      backgroundColor: colors.primary,
      paddingVertical: 16,
      paddingHorizontal: 16,
      borderRadius: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 54,
    },
    sendBtnDisabled: { opacity: 0.45 },
    sendIcon: { marginRight: 8 },
    sendingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    sendingText: {
      fontFamily: font.semiBold,
      fontSize: 15,
      color: colors.primaryContrast,
    },
    sendBtnText: {
      flex: 1,
      minWidth: 0,
      fontFamily: font.semiBold,
      fontSize: 16,
      color: colors.primaryContrast,
      textAlign: 'center',
    },
  });
}
