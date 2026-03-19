import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Image,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { font } from '../../theme/typography';
import { getOrCreateChat } from '../../api/chat';
import { getInitials } from '../../utils';
import { SkeletonStudentListRow } from '../../components/Skeleton';
import type { ColorPalette } from '../../theme/colors';
import type { Child } from '../../../../shared/types';

const MESSAGE_ACCENT_KEYS = ['primary', 'teal', 'orange'] as const;
const SKELETON_ROW_KEYS = ['s0', 's1', 's2', 's3'] as const;

export function TeacherStudentsScreen({
  navigation,
}: {
  navigation: { navigate: (name: string, params?: object) => void; getParent: () => { navigate: (name: string, params?: object) => void } | undefined };
}) {
  const { profile } = useAuth();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const [children, setChildren] = useState<Child[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [messageLoadingForId, setMessageLoadingForId] = useState<string | null>(null);
  /** True after first roster resolution (empty or not); not cleared on pull-to-refresh. */
  const [listLoaded, setListLoaded] = useState(false);
  const prevSchoolIdRef = useRef<string | undefined>(undefined);
  const prevUidRef = useRef<string | undefined>(undefined);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setRefreshTrigger((t) => t + 1);
  }, []);

  useEffect(() => {
    const schoolId = profile?.schoolId;
    const uid = profile?.uid;

    if (!schoolId || !uid) {
      setChildren([]);
      setListLoaded(true);
      setRefreshing(false);
      prevSchoolIdRef.current = schoolId;
      prevUidRef.current = uid;
      return;
    }

    const profileChanged =
      prevSchoolIdRef.current !== schoolId || prevUidRef.current !== uid;
    prevSchoolIdRef.current = schoolId;
    prevUidRef.current = uid;
    if (profileChanged) setListLoaded(false);

    let cancelled = false;
    let unsub: (() => void) | null = null;

    (async () => {
      const classesSnap = await getDocs(collection(db, 'schools', schoolId, 'classes'));
      if (cancelled) return;
      const myClasses = classesSnap.docs.filter(
        (d) => (d.data() as { assignedTeacherId?: string }).assignedTeacherId === uid
      );
      const classIds = myClasses.map((d) => d.id).slice(0, 10);

      if (classIds.length === 0) {
        setChildren([]);
        setListLoaded(true);
        setRefreshing(false);
        return;
      }

      unsub = onSnapshot(
        query(collection(db, 'schools', schoolId, 'children'), where('classId', 'in', classIds)),
        (snap) => {
          if (cancelled) return;
          setChildren(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Child)));
          setListLoaded(true);
          setRefreshing(false);
        }
      );
    })();

    return () => {
      cancelled = true;
      if (unsub) unsub();
    };
  }, [profile?.schoolId, profile?.uid, refreshTrigger]);

  const messageAccent = useCallback(
    (index: number) => {
      const key = MESSAGE_ACCENT_KEYS[index % MESSAGE_ACCENT_KEYS.length];
      if (key === 'primary') return colors.primary;
      if (key === 'teal') return colors.accentTeal;
      return colors.accentOrange;
    },
    [colors]
  );

  const messageBubbleBackground = useCallback(
    (index: number) => {
      const key = MESSAGE_ACCENT_KEYS[index % MESSAGE_ACCENT_KEYS.length];
      if (key === 'primary') return colors.accentPurpleSoft;
      if (key === 'teal') return colors.accentTealSoft;
      return colors.accentOrangeSoft;
    },
    [colors]
  );

  const onMessageParent = useCallback(
    async (child: Child) => {
      const schoolId = profile?.schoolId;
      if (!schoolId || !child.parentIds?.length) {
        Alert.alert('No parents', 'This child has no linked parents.');
        return;
      }
      setMessageLoadingForId(child.id);
      try {
        const { chatId, schoolId: sid } = await getOrCreateChat(
          schoolId,
          child.id,
          child.parentIds[0]
        );
        navigation.getParent()?.navigate('ChatThread', { chatId, schoolId: sid });
      } catch {
        Alert.alert('Error', 'Could not start conversation. Please try again.');
      } finally {
        setMessageLoadingForId(null);
      }
    },
    [profile?.schoolId, navigation]
  );

  const students = useMemo(
    () => [...children].sort((a, b) => a.name.localeCompare(b.name)),
    [children]
  );

  const renderChild = ({ item, index }: { item: Child; index: number }) => {
    const hasParents = item.parentIds && item.parentIds.length > 0;
    const isMessageLoading = messageLoadingForId === item.id;
    const accent = messageAccent(index);
    const bubbleBg = messageBubbleBackground(index);
    const allergyLine = item.allergies?.length
      ? item.allergies.join(', ')
      : null;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.getParent()?.navigate('Reports', { childId: item.id })}
        activeOpacity={0.75}
      >
        <View style={styles.avatarWrap}>
          {item.photoURL ? (
            <Image source={{ uri: item.photoURL }} style={styles.avatarImg} />
          ) : (
            <View style={[styles.avatar, { backgroundColor: colors.avatarBg }]}>
              <Text style={[styles.avatarInitials, { color: colors.avatarText }]}>
                {getInitials(item.name)}
              </Text>
            </View>
          )}
          {hasParents ? <View style={[styles.avatarDot, { backgroundColor: colors.accentTeal }]} /> : null}
        </View>
        <View style={styles.cardContent}>
          <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
            {item.name}
          </Text>
          {allergyLine ? (
            <View style={styles.allergyRow}>
              <Ionicons name="warning" size={14} color={colors.warning} style={styles.allergyIcon} />
              <Text style={[styles.allergies, { color: colors.textSecondary }]} numberOfLines={2}>
                {allergyLine}
              </Text>
            </View>
          ) : (
            <Text style={[styles.noAllergies, { color: colors.textMuted }]}>NO ALLERGIES</Text>
          )}
        </View>
        <TouchableOpacity
          style={[styles.messageCircle, { backgroundColor: bubbleBg }]}
          onPress={(e) => {
            e.stopPropagation();
            onMessageParent(item);
          }}
          disabled={!hasParents || isMessageLoading}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          {isMessageLoading ? (
            <ActivityIndicator size="small" color={accent} />
          ) : (
            <Ionicons name="chatbubble-outline" size={22} color={accent} />
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const renderSkeletonRow = () => <SkeletonStudentListRow />;

  const showSkeleton = !listLoaded;
  const listData = showSkeleton ? [...SKELETON_ROW_KEYS] : students;

  return (
    <View style={[styles.container, { backgroundColor: colors.backgroundSecondary }]}>
      <FlatList<(typeof SKELETON_ROW_KEYS)[number] | Child>
        data={listData}
        keyExtractor={(item) => (typeof item === 'string' ? item : item.id)}
        renderItem={({ item, index }) =>
          typeof item === 'string' ? renderSkeletonRow() : renderChild({ item, index })
        }
        contentContainerStyle={styles.listContent}
        accessibilityState={showSkeleton ? { busy: true } : undefined}
        ListEmptyComponent={
          listLoaded && students.length === 0 ? (
            <View style={styles.emptyCard}>
              <View style={[styles.emptyIconWrap, { backgroundColor: colors.accentPurpleSoft }]}>
                <Ionicons name="people-outline" size={28} color={colors.accentPurple} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                No students yet
              </Text>
              <Text style={[styles.emptyBody, { color: colors.textMuted }]}>
                Students assigned to your class will appear here.
              </Text>
            </View>
          ) : null
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

function createStyles(colors: ColorPalette, isDark: boolean) {
  return StyleSheet.create({
    container: { flex: 1 },
    listContent: {
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 32,
    },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      paddingVertical: 14,
      paddingHorizontal: 14,
      borderRadius: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      ...(!isDark
        ? Platform.select({
            ios: {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.06,
              shadowRadius: 8,
            },
            android: { elevation: 2 },
            default: {},
          })
        : {}),
    },
    avatarWrap: {
      position: 'relative',
      marginRight: 14,
    },
    avatar: {
      width: 52,
      height: 52,
      borderRadius: 26,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarImg: {
      width: 52,
      height: 52,
      borderRadius: 26,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    avatarInitials: {
      fontFamily: font.bold,
      fontSize: 18,
    },
    avatarDot: {
      position: 'absolute',
      right: 0,
      bottom: 0,
      width: 12,
      height: 12,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: colors.card,
    },
    cardContent: { flex: 1, minWidth: 0 },
    name: {
      fontFamily: font.bold,
      fontSize: 17,
      fontWeight: '700',
    },
    allergyRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginTop: 6,
    },
    allergyIcon: { marginRight: 6, marginTop: 1 },
    allergies: {
      flex: 1,
      fontFamily: font.regular,
      fontSize: 13,
      lineHeight: 18,
    },
    noAllergies: {
      fontFamily: font.semiBold,
      fontSize: 11,
      letterSpacing: 0.5,
      marginTop: 6,
    },
    messageCircle: {
      width: 48,
      height: 48,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 8,
    },
    emptyCard: {
      marginTop: 18,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 16,
      paddingVertical: 24,
      paddingHorizontal: 18,
      alignItems: 'center',
    },
    emptyIconWrap: {
      width: 52,
      height: 52,
      borderRadius: 26,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
    },
    emptyTitle: {
      fontFamily: font.bold,
      fontSize: 17,
      fontWeight: '700',
      textAlign: 'center',
    },
    emptyBody: {
      marginTop: 6,
      textAlign: 'center',
      fontFamily: font.regular,
      fontSize: 14,
      lineHeight: 20,
      paddingHorizontal: 8,
    },
  });
}
