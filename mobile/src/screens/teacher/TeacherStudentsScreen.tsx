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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { getOrCreateChat } from '../../api/chat';
import { getInitials } from '../../utils';
import { NotificationBellButton } from '../../components/NotificationBellButton';
import { HeaderBlock, Overline, DisplayTitle } from '../../components/brand/HeaderBlock';
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
import { brandFont } from '../../theme/typography';
import type { Child } from '../../../../shared/types';

const SKELETON_ROW_KEYS = ['s0', 's1', 's2', 's3'] as const;

export function TeacherStudentsScreen({
  navigation,
}: {
  navigation: { navigate: (name: string, params?: object) => void; getParent: () => { navigate: (name: string, params?: object) => void } | undefined };
}) {
  const { profile } = useAuth();
  const { colors, brand, category } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(brand, category), [brand, category]);
  const tabBarClearance = Platform.OS === 'ios' ? insets.bottom + NATIVE_TAB_BAR_CLEARANCE_IOS : 24;
  const [children, setChildren] = useState<Child[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [messageLoadingForId, setMessageLoadingForId] = useState<string | null>(null);
  /** True after first roster resolution (empty or not); not cleared on pull-to-refresh. */
  const [listLoaded, setListLoaded] = useState(false);
  /** Room name(s) from the classes already fetched for the roster query. */
  const [roomName, setRoomName] = useState<string | null>(null);
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
      const names = myClasses
        .map((d) => (d.data() as { name?: string }).name)
        .filter((n): n is string => !!n);
      setRoomName(names.length ? names.join(' · ') : null);

      if (classIds.length === 0) {
        setChildren([]);
        setListLoaded(true);
        setRefreshing(false);
        return;
      }

      unsub = onSnapshot(
        query(
          collection(db, 'schools', schoolId, 'children'),
          where('classId', 'in', classIds),
          where('isActive', '==', true)
        ),
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
    const hasParents = !!item.parentIds && item.parentIds.length > 0;
    const isMessageLoading = messageLoadingForId === item.id;
    const allergies = item.allergies ?? [];
    const firstName = item.name.split(' ')[0] ?? item.name;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.getParent()?.navigate('Reports', { childId: item.id })}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={`${item.name}, ${
          allergies.length ? `allergies: ${allergies.join(', ')}` : 'no allergies'
        }. Open daily report`}
      >
        <View style={styles.cardRow}>
          <View style={styles.avatarWrap}>
            {item.photoURL ? (
              <Image source={{ uri: item.photoURL }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, { backgroundColor: avatarCategoryColor(category, index) }]}>
                <Text style={styles.avatarInitials}>{getInitials(item.name)}</Text>
              </View>
            )}
            {hasParents ? <View style={styles.avatarDot} /> : null}
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.name} numberOfLines={2}>
              {item.name}
            </Text>
            {allergies.length ? (
              <Text style={styles.subline}>
                {allergies.length === 1 ? '1 allergy' : `${allergies.length} allergies`}
              </Text>
            ) : (
              <View style={styles.sublineRow}>
                <Ionicons name="checkmark" size={16} color={brand.textSecondary} />
                <Text style={styles.subline}>No allergies</Text>
              </View>
            )}
          </View>
          <TouchableOpacity
            style={[styles.messageCircle, !hasParents && styles.messageDisabled]}
            onPress={(e) => {
              e.stopPropagation();
              onMessageParent(item);
            }}
            disabled={!hasParents || isMessageLoading}
            accessibilityRole="button"
            accessibilityLabel={`Message ${firstName}'s parents`}
            accessibilityState={{ disabled: !hasParents || isMessageLoading, busy: isMessageLoading }}
          >
            {isMessageLoading ? (
              <ActivityIndicator size="small" color={brand.onInverse} />
            ) : (
              <Ionicons name="chatbubble-outline" size={20} color={brand.onInverse} />
            )}
          </TouchableOpacity>
        </View>
        {allergies.length ? (
          <View style={styles.allergyBand}>
            <Ionicons name="warning-outline" size={18} color={category.onCategory} />
            <Text style={styles.allergyBandText} numberOfLines={2}>
              {allergies.length === 1 ? 'Allergy' : 'Allergies'}: {allergies.join(', ')}
            </Text>
          </View>
        ) : null}
      </TouchableOpacity>
    );
  };

  const showSkeleton = !listLoaded;
  const listData = showSkeleton ? [...SKELETON_ROW_KEYS] : students;

  return (
    <View style={styles.container}>
      <FlatList<(typeof SKELETON_ROW_KEYS)[number] | Child>
        data={listData}
        keyExtractor={(item) => (typeof item === 'string' ? item : item.id)}
        renderItem={({ item, index }) =>
          typeof item === 'string' ? <BrandSkeletonStudentCard /> : renderChild({ item, index })
        }
        ListHeaderComponent={
          <HeaderBlock style={styles.header}>
            <View style={styles.headerRow}>
              <View style={styles.headerTitles}>
                {roomName ? <Overline>{roomName}</Overline> : null}
                <DisplayTitle>Students</DisplayTitle>
              </View>
              <NotificationBellButton
                variant="header"
                colors={colors}
                onPress={() => navigation.getParent()?.navigate('UserNotifications')}
              />
            </View>
          </HeaderBlock>
        }
        ItemSeparatorComponent={() => <View style={{ height: spacing.gapM }} />}
        contentContainerStyle={[styles.listContent, { paddingBottom: tabBarClearance }]}
        accessibilityState={showSkeleton ? { busy: true } : undefined}
        ListEmptyComponent={
          listLoaded && students.length === 0 ? (
            <View style={[styles.emptyCard, styles.listItemInset]}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="people-outline" size={28} color={category.onCategory} />
              </View>
              <Text style={styles.emptyTitle}>No students yet</Text>
              <Text style={styles.emptyBody}>Students assigned to your class will appear here.</Text>
            </View>
          ) : null
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={brand.onHeader}
            colors={[brand.headerBackground]}
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

function createStyles(brand: BrandPalette, category: CategoryPalette) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: brand.background },
    header: { marginHorizontal: -spacing.screenX, marginBottom: spacing.gapL },
    headerRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 },
    headerTitles: { flex: 1, gap: 6 },
    listContent: {
      paddingHorizontal: spacing.screenX,
      paddingBottom: 24,
    },
    listItemInset: {},
    card: {
      backgroundColor: brand.surface,
      borderRadius: radius.card,
      overflow: 'hidden',
    },
    cardRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      padding: 16,
    },
    avatarWrap: { position: 'relative' },
    avatar: {
      width: 64,
      height: 64,
      borderRadius: radius.tile,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarInitials: {
      fontFamily: brandFont.display800,
      fontSize: 24,
      letterSpacing: -0.5,
      color: category.onCategory,
    },
    avatarDot: {
      position: 'absolute',
      right: -4,
      top: -4,
      width: 18,
      height: 18,
      borderRadius: 9,
      borderWidth: 3,
      borderColor: brand.surface,
      backgroundColor: brand.statusPresent,
    },
    cardContent: { flex: 1, minWidth: 0, gap: 4 },
    name: { ...typeTokens.cardTitle, lineHeight: 23, color: brand.textPrimary },
    sublineRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    subline: { fontFamily: brandFont.body600, fontSize: 14, color: brand.textSecondary },
    messageCircle: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: brand.inverseFill,
      alignItems: 'center',
      justifyContent: 'center',
    },
    messageDisabled: { opacity: 0.35 },
    allergyBand: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 10,
      paddingHorizontal: 18,
      backgroundColor: category.meal,
    },
    allergyBandText: { flex: 1, ...typeTokens.label, color: category.onCategory },
    emptyCard: {
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
