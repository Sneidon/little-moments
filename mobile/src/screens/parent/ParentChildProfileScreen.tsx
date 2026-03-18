import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  RefreshControl,
  useWindowDimensions,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { collection, doc, getDoc, onSnapshot, orderBy, query } from 'firebase/firestore';
import { RootStackParamList } from '../../navigation/MainTabs';
import { db } from '../../config/firebase';
import type { Child, DailyReport } from '../../../../shared/types';
import { useTheme } from '../../context/ThemeContext';
import { font } from '../../theme/typography';
import { getAge, getInitials, formatTime } from '../../utils';
import { getParentHomeContentStyles } from './parentHomeContentStyles';
import { getOrCreateChat } from '../../api/chat';
import { EmptyState } from '../../components/EmptyState';

type Props = NativeStackScreenProps<RootStackParamList, 'ChildProfile'>;

function formatReportTypeLabel(type: string): string {
  switch (type) {
    case 'meal':
      return 'Meal';
    case 'nap_time':
      return 'Nap';
    case 'nappy_change':
      return 'Nappy change';
    case 'medication':
      return 'Medication';
    case 'incident':
      return 'Incident';
    default:
      return type.replace(/_/g, ' ');
  }
}

export function ParentChildProfileScreen({ route, navigation }: Props) {
  const { childId, schoolId } = route.params;
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { colors } = useTheme();
  const styles = useMemo(() => createChildProfileStyles(colors, width), [colors, width]);

  const [child, setChild] = useState<Child | null>(null);
  const [className, setClassName] = useState<string | null>(null);
  const [loadingChild, setLoadingChild] = useState(true);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const isToday = selectedDate === new Date().toISOString().slice(0, 10);

  const openHeaderMenu = useCallback(() => {
    if (!child) return;
    Alert.alert('Options', undefined, [
      {
        text: 'Edit profile',
        onPress: () =>
          (navigation.getParent() as { navigate: (n: string, p?: object) => void } | undefined)?.navigate(
            'EditChildProfile',
            { childId: child.id, schoolId }
          ),
      },
      {
        text: 'Message teacher',
        onPress: async () => {
          if (!child.assignedTeacherId) {
            Alert.alert(
              'No teacher assigned',
              'This child does not have an assigned teacher yet.'
            );
            return;
          }
          try {
            const { chatId, schoolId: sid } = await getOrCreateChat(
              schoolId,
              child.id,
              child.assignedTeacherId
            );
            (navigation.getParent() as { navigate: (n: string, p?: object) => void } | undefined)?.navigate(
              'ChatThread',
              { chatId, schoolId: sid }
            );
          } catch {
            Alert.alert('Error', 'Could not open messages. Please try again.');
          }
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, [child, navigation, schoolId]);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'schools', schoolId, 'children', childId));
        if (cancelled) return;
        if (snap.exists()) {
          const c = { id: snap.id, ...snap.data() } as Child;
          setChild(c);
          if (c.classId) {
            const cls = await getDoc(doc(db, 'schools', schoolId, 'classes', c.classId));
            if (!cancelled && cls.exists()) setClassName((cls.data() as { name?: string }).name ?? null);
          } else {
            setClassName(null);
          }
        }
      } finally {
        if (!cancelled) setLoadingChild(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [childId, schoolId]);

  useEffect(() => {
    if (!schoolId || !childId) return;
    const q = query(
      collection(db, 'schools', schoolId, 'children', childId, 'reports'),
      orderBy('timestamp', 'desc')
    );
    const start = `${selectedDate}T00:00:00.000Z`;
    const end = `${selectedDate}T23:59:59.999Z`;
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as DailyReport));
        const filtered = list.filter((r) => r.timestamp >= start && r.timestamp <= end);
        setReports(filtered);
        setLoadingReports(false);
        setRefreshing(false);
      },
      () => {
        setLoadingReports(false);
        setRefreshing(false);
      }
    );
    return () => unsub();
  }, [childId, schoolId, selectedDate, refreshTrigger]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setRefreshTrigger((t) => t + 1);
  }, []);

  const meals = reports.filter((r) => r.type === 'meal').length;
  const naps = reports.filter((r) => r.type === 'nap_time').length;
  const nappy = reports.filter((r) => r.type === 'nappy_change').length;
  const activities = reports.filter(
    (r) => r.type !== 'meal' && r.type !== 'nap_time' && r.type !== 'nappy_change'
  ).length;

  const prevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().slice(0, 10));
  };
  const nextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    const today = new Date().toISOString().slice(0, 10);
    if (d.toISOString().slice(0, 10) > today) return;
    setSelectedDate(d.toISOString().slice(0, 10));
  };

  const onDatePickerChange = (event: { type: string }, date?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (event.type === 'dismissed') return;
    if (date) setSelectedDate(date.toISOString().slice(0, 10));
  };

  const reportTypeIcon = (type: string) => {
    if (type === 'meal') return 'restaurant-outline';
    if (type === 'nap_time') return 'bed-outline';
    if (type === 'nappy_change') return 'water-outline';
    return 'sparkles-outline';
  };

  const displayDate = isToday
    ? 'Today'
    : new Date(selectedDate).toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });

  const scrollBottomPad = 24 + Math.max(insets.bottom, 12);

  if (loadingChild) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.backgroundSecondary, paddingBottom: insets.bottom }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingHint, { color: colors.textMuted }]}>Loading profile…</Text>
      </View>
    );
  }

  if (!child) {
    return (
      <View
        style={[
          styles.centered,
          { backgroundColor: colors.backgroundSecondary, paddingBottom: insets.bottom, paddingHorizontal: 24 },
        ]}
      >
        <Ionicons name="person-outline" size={48} color={colors.textMuted} />
        <Text style={[styles.notFoundTitle, { color: colors.text }]}>Child not found</Text>
        <Text style={[styles.notFoundSub, { color: colors.textSecondary }]}>
          This profile may have been removed or you may not have access.
        </Text>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
          activeOpacity={0.85}
        >
          <Text style={[styles.primaryBtnText, { color: colors.primaryContrast }]}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: scrollBottomPad }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header matches ParentHomeScreen: one row, profile (with back) + menu + same role pill */}
        <View style={[styles.header, { paddingTop: Math.max(56, insets.top + 12) }]}>
          <View style={styles.headerMain}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.headerBackWrap}
              hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <Ionicons name="arrow-back" size={24} color={colors.headerText} />
            </TouchableOpacity>
            <View style={styles.headerProfile}>
              {child.photoURL ? (
                <Image source={{ uri: child.photoURL }} style={styles.avatarPhotoHome} />
              ) : (
                <View style={styles.avatarLarge}>
                  <Text style={styles.avatarLargeText}>{getInitials(child.name)}</Text>
                </View>
              )}
              <View style={styles.headerText}>
                <Text style={styles.headerName} numberOfLines={1}>
                  {child.name}
                </Text>
                <Text style={styles.headerClass} numberOfLines={1}>
                  {getAge(child.dateOfBirth)}
                  {className ? ` · ${className}` : ''}
                </Text>
              </View>
            </View>
          </View>
          <TouchableOpacity
            onPress={openHeaderMenu}
            style={styles.headerMenuInline}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="More options"
          >
            <Ionicons name="ellipsis-horizontal" size={22} color={colors.headerText} />
          </TouchableOpacity>
          <View style={styles.roleTag}>
            <Text style={styles.roleTagText}>Parent</Text>
          </View>
        </View>

        <View style={styles.dateBar}>
          <TouchableOpacity onPress={prevDay} style={styles.dateArrow}>
            <Ionicons name="chevron-back" size={24} color={colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.dateCenter}
            onPress={() => setShowDatePicker(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="calendar-outline" size={20} color={colors.textMuted} />
            <Text style={styles.dateText}>{displayDate}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={nextDay} style={styles.dateArrow} disabled={isToday}>
            <Ionicons
              name="chevron-forward"
              size={24}
              color={colors.textMuted}
              style={{ opacity: isToday ? 0.28 : 1 }}
            />
          </TouchableOpacity>
        </View>

        {showDatePicker && (
          <>
            <DateTimePicker
              value={new Date(selectedDate + 'T12:00:00')}
              mode="date"
              display={Platform.OS === 'ios' ? 'calendar' : 'default'}
              onChange={onDatePickerChange}
              maximumDate={new Date()}
            />
            {Platform.OS === 'ios' && (
              <TouchableOpacity style={styles.datePickerDone} onPress={() => setShowDatePicker(false)}>
                <Text style={styles.datePickerDoneText}>Done</Text>
              </TouchableOpacity>
            )}
          </>
        )}

        <View style={styles.sectionTightTop}>
          <View style={styles.sectionHeaderAligned}>
            <Text style={styles.sectionOverviewTitleFlex} numberOfLines={2}>
              {"Today's Overview"}
            </Text>
            <TouchableOpacity
              style={styles.sectionBtnShrink}
              onPress={() =>
                (navigation.getParent() as { navigate: (name: string) => void } | undefined)?.navigate(
                  'ParentAnnouncements'
                )
              }
              activeOpacity={0.7}
            >
              <Text style={styles.sectionBtnText}>Announcements</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.statsRowAligned}>
            <View style={[styles.statCard, styles.statCell]}>
              <Text style={[styles.statValue, styles.statMealsValue]}>{meals}</Text>
              <Text style={styles.statLabel}>Meals</Text>
            </View>
            <View style={[styles.statCard, styles.statCell]}>
              <Text style={[styles.statValue, styles.statNapValue]}>{naps}</Text>
              <Text style={styles.statLabel}>Nap</Text>
            </View>
            <View style={[styles.statCard, styles.statCell]}>
              <Text style={[styles.statValue, styles.statNappyValue]}>{nappy}</Text>
              <Text style={styles.statLabel}>Nappy</Text>
            </View>
            <View style={[styles.statCard, styles.statCell]}>
              <Text style={[styles.statValue, styles.statActivitiesValue]}>{activities}</Text>
              <Text style={styles.statLabel}>Activities</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionBlockTitle}>
            {isToday ? "Today's Updates" : 'Updates'}
          </Text>
          {loadingReports ? (
            <View style={styles.updatesLoading}>
              <ActivityIndicator color={colors.primary} />
              <Text style={[styles.updatesLoadingText, { color: colors.textMuted }]}>Loading updates…</Text>
            </View>
          ) : reports.length === 0 ? (
            <View style={styles.emptyUpdatesWrap}>
              <EmptyState
                icon="clipboard-outline"
                title="No updates for this day"
                subtitle="When teachers log meals, naps, or activities, they will show up here."
              />
            </View>
          ) : (
            reports.map((item) => (
              <View key={item.id} style={styles.updateCard}>
                <View style={[styles.updateIconCircle, { backgroundColor: colors.primaryMuted }]}>
                  <Ionicons
                    name={reportTypeIcon(item.type) as keyof typeof Ionicons.glyphMap}
                    size={20}
                    color={colors.primary}
                  />
                </View>
                <View style={styles.updateCardContent}>
                  <Text style={styles.updateTime}>{formatTime(item.timestamp)}</Text>
                  <Text style={styles.updateType}>{formatReportTypeLabel(item.type)}</Text>
                  {item.notes ? <Text style={styles.updateNotes}>{item.notes}</Text> : null}
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function createChildProfileStyles(colors: import('../../theme/colors').ColorPalette, screenWidth: number) {
  const shared = getParentHomeContentStyles(colors);
  const compactStats = screenWidth < 360;
  return StyleSheet.create({
    ...shared,
    container: { flex: 1, backgroundColor: colors.backgroundSecondary },
    scroll: { flex: 1 },
    scrollContent: { flexGrow: 1 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingHint: {
      marginTop: 14,
      fontFamily: font.regular,
      fontSize: 15,
    },
    notFoundTitle: {
      fontFamily: font.semiBold,
      fontSize: 18,
      marginTop: 16,
      textAlign: 'center',
    },
    notFoundSub: {
      fontFamily: font.regular,
      fontSize: 14,
      marginTop: 8,
      textAlign: 'center',
      lineHeight: 20,
    },
    primaryBtn: {
      marginTop: 24,
      paddingVertical: 14,
      paddingHorizontal: 28,
      borderRadius: 12,
    },
    primaryBtnText: { fontFamily: font.semiBold, fontSize: 16 },

    /** Matches ParentHomeScreen header */
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 20,
      backgroundColor: colors.header,
    },
    headerMain: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      minWidth: 0,
      marginRight: 8,
    },
    headerBackWrap: {
      paddingVertical: 4,
      paddingRight: 10,
      marginLeft: -4,
    },
    headerProfile: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      minWidth: 0,
    },
    avatarLarge: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.headerAccent,
      borderWidth: 2,
      borderColor: colors.headerText,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarPhotoHome: {
      width: 48,
      height: 48,
      borderRadius: 24,
      borderWidth: 2,
      borderColor: colors.headerText,
    },
    avatarLargeText: { fontSize: 18, fontWeight: '700', color: colors.headerText },
    headerText: { marginLeft: 14, flex: 1, minWidth: 0 },
    headerName: { fontSize: 20, fontWeight: '700', color: colors.headerText },
    headerClass: { fontSize: 14, color: colors.headerTextMuted, marginTop: 2 },
    headerMenuInline: {
      paddingHorizontal: 4,
      paddingVertical: 8,
      justifyContent: 'center',
      flexShrink: 0,
    },
    roleTag: {
      backgroundColor: colors.headerAccent,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      flexShrink: 0,
    },
    roleTagText: { fontSize: 13, fontWeight: '600', color: colors.headerText },

    sectionTightTop: {
      marginTop: 18,
      paddingHorizontal: 16,
    },
    sectionHeaderAligned: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
      gap: 10,
    },
    sectionOverviewTitleFlex: {
      flex: 1,
      minWidth: 0,
      fontSize: 18,
      fontFamily: font.bold,
      color: colors.textSecondary,
      letterSpacing: -0.2,
    },
    sectionBtnShrink: {
      flexShrink: 0,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 10,
      backgroundColor: colors.backgroundSecondary,
      borderWidth: 1,
      borderColor: colors.border,
    },

    statsRowAligned: {
      flexDirection: 'row',
      flexWrap: 'nowrap',
      gap: compactStats ? 6 : 10,
      alignItems: 'stretch',
    },
    statCell: {
      flex: 1,
      minWidth: 0,
      paddingVertical: compactStats ? 10 : 14,
      paddingHorizontal: compactStats ? 4 : 14,
    },
    statValue: {
      fontSize: compactStats ? 22 : 26,
      fontFamily: font.bold,
      fontWeight: '800',
      color: colors.textSecondary,
    },
    statLabel: {
      fontSize: compactStats ? 11 : 12,
      fontFamily: font.medium,
      color: colors.textMuted,
      marginTop: 4,
      textAlign: 'center',
    },

    updatesLoading: {
      alignItems: 'center',
      paddingVertical: 28,
    },
    updatesLoadingText: {
      marginTop: 12,
      fontFamily: font.regular,
      fontSize: 14,
    },
    emptyUpdatesWrap: {
      marginHorizontal: -8,
    },

    updateCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: colors.card,
      padding: 14,
      borderRadius: 14,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    updateIconCircle: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    updateCardContent: { flex: 1, minWidth: 0 },
    updateTime: {
      fontSize: 12,
      fontFamily: font.medium,
      color: colors.textMuted,
    },
    updateType: {
      fontSize: 15,
      fontFamily: font.semiBold,
      color: colors.text,
      marginTop: 4,
    },
    updateNotes: {
      fontSize: 14,
      fontFamily: font.regular,
      color: colors.textSecondary,
      marginTop: 6,
      lineHeight: 20,
    },
  });
}
