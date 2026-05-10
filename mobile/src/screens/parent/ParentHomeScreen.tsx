import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Platform,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHeaderHeight } from '@react-navigation/elements';
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  onSnapshot,
  doc,
  getDoc,
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';

import { getOrCreateChat } from '../../api/chat';
import app, { db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Skeleton } from '../../components/Skeleton';
import { getAge, getInitials, formatTime } from '../../utils';
import { getCached, setCached, LIST_TTL_MS } from '../../utils/cache';
import { useNotificationNavigation } from '../../hooks/useNotificationNavigation';
import { useDateNavigation } from '../../hooks/useDateNavigation';
import { font } from '../../theme/typography';

import type { Child } from '../../../../shared/types';
import type { ClassRoom } from '../../../../shared/types';
import type { DailyReport } from '../../../../shared/types';

type RootNav = { navigate: (name: string, params?: object) => void } | undefined;

function formatParentReportLabel(type: string): string {
  switch (type) {
    case 'meal':
      return 'Meal';
    case 'nap_time':
      return 'Nap';
    case 'nappy_change':
      return 'Nappy change';
    case 'check_in':
      return 'Check in';
    case 'check_out':
      return 'Check out';
    case 'activity':
      return 'Activity';
    case 'medication':
      return 'Medication';
    case 'incident':
      return 'Photo';
    default:
      return type.replace(/_/g, ' ');
  }
}

function reportTypeIconName(type: string): keyof typeof Ionicons.glyphMap {
  if (type === 'meal') return 'restaurant';
  if (type === 'nap_time') return 'moon';
  if (type === 'nappy_change') return 'water';
  if (type === 'check_in') return 'log-in';
  if (type === 'check_out') return 'log-out';
  if (type === 'medication') return 'medical';
  if (type === 'incident') return 'camera';
  return 'color-palette';
}

export function ParentHomeScreen({
  navigation,
}: {
  navigation: {
    navigate: (a: string, b?: { childId: string; schoolId: string }) => void;
    getParent: () => { navigate: (a: string, b?: object) => void } | undefined;
  };
}) {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  /** Native header already clears the status bar; avoid double top inset. */
  const homeTopPadding = headerHeight > 0 ? 8 : Math.max(insets.top + 8, 12);
  const { profile, selectedChildId, setSelectedChildId } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  useNotificationNavigation(true);

  const {
    selectedDate,
    showDatePicker,
    setShowDatePicker,
    prevDay,
    nextDay,
    onDatePickerChange,
    maxDate,
    isToday,
  } = useDateNavigation();

  const [children, setChildren] = useState<Child[]>([]);
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [className, setClassName] = useState<string | null>(null);
  const [messageLoading, setMessageLoading] = useState(false);
  const [tourShown, setTourShown] = useState(false);

  const selectedChild = children.find((c) => c.id === selectedChildId) ?? children[0];
  const rootStack = navigation.getParent() as RootNav;

  useEffect(() => {
    if (tourShown) return;
    if (profile?.role !== 'parent') return;
    if ((profile as any).parentStatus !== 'ACTIVE') return;
    if ((profile as any).onboardingTourCompletedAt) return;
    // Show a simple 2-step tour (mobile-friendly).
    setTourShown(true);
    Alert.alert('Welcome!', 'Tap the heart to react to a moment.', [
      {
        text: 'Next',
        onPress: () => {
          Alert.alert('Tip', 'Swipe for older moments.', [
            {
              text: 'Done',
              onPress: () => {
                const fn = httpsCallable(getFunctions(app), 'completeParentOnboardingTour');
                fn({}).catch(() => {});
              },
            },
          ]);
        },
      },
    ]);
  }, [profile?.role, (profile as any)?.parentStatus, (profile as any)?.onboardingTourCompletedAt, tourShown]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setRefreshTrigger((t) => t + 1);
  }, []);

  const onMessageTeacher = useCallback(async () => {
    if (!selectedChild?.assignedTeacherId) {
      Alert.alert(
        'No teacher assigned',
        'Your selected child does not have an assigned teacher yet.'
      );
      return;
    }
    setMessageLoading(true);
    try {
      const { chatId, schoolId: sid } = await getOrCreateChat(
        selectedChild.schoolId,
        selectedChild.id,
        selectedChild.assignedTeacherId
      );
      rootStack?.navigate('ChatThread', { chatId, schoolId: sid });
    } catch {
      Alert.alert('Error', 'Could not open messages. Please try again.');
    } finally {
      setMessageLoading(false);
    }
  }, [selectedChild, rootStack]);

  useEffect(() => {
    const uid = profile?.uid;
    if (!uid) return;
    (async () => {
      const cacheKey = `parent:children:${uid}`;
      const cached = await getCached<Child[]>(cacheKey);
      if (cached?.length) {
        setChildren(cached);
        setSelectedChildId((prev) => {
          if (!prev || !cached.some((c) => c.id === prev)) return cached[0].id;
          return prev;
        });
      }
      const schoolsSnap = await getDocs(collection(db, 'schools'));
      const list: Child[] = [];
      for (const schoolDoc of schoolsSnap.docs) {
        const q = query(
          collection(db, 'schools', schoolDoc.id, 'children'),
          where('parentIds', 'array-contains', uid),
          where('isActive', '==', true)
        );
        const snap = await getDocs(q);
        snap.docs.forEach((d) => list.push({ id: d.id, ...d.data() } as Child));
      }
      setChildren(list);
      if (list.length > 0) {
        await setCached(cacheKey, list, LIST_TTL_MS);
        setSelectedChildId((prev) => {
          if (!prev || !list.some((c) => c.id === prev)) return list[0].id;
          return prev;
        });
      }
    })();
  }, [profile?.uid, setSelectedChildId, refreshTrigger]);

  useEffect(() => {
    if (!selectedChild?.schoolId || !selectedChild?.classId) {
      setClassName(null);
      return;
    }
    const { schoolId, classId } = selectedChild;
    const cacheKey = `parent:class:${schoolId}:${classId}`;
    (async () => {
      const cached = await getCached<string | null>(cacheKey);
      if (cached != null) setClassName(cached);
      const snap = await getDoc(doc(db, 'schools', schoolId, 'classes', classId));
      if (snap.exists()) {
        const name = (snap.data() as ClassRoom).name;
        setClassName(name);
        await setCached(cacheKey, name, LIST_TTL_MS);
      } else {
        setClassName(null);
      }
    })();
  }, [selectedChild?.schoolId, selectedChild?.classId]);

  useEffect(() => {
    if (!selectedChild?.schoolId || !selectedChild?.id) return;
    const start = `${selectedDate}T00:00:00.000Z`;
    const end = `${selectedDate}T23:59:59.999Z`;
    const q = query(
      collection(db, 'schools', selectedChild.schoolId, 'children', selectedChild.id, 'reports'),
      orderBy('timestamp', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as DailyReport));
      const filtered = list.filter((r) => r.timestamp >= start && r.timestamp <= end);
      setReports(filtered);
      setRefreshing(false);
    });
    return () => unsub();
  }, [selectedChild?.id, selectedChild?.schoolId, selectedDate, refreshTrigger]);

  const overviewDateLabel = useMemo(
    () =>
      new Date(selectedDate + 'T12:00:00').toLocaleDateString(undefined, {
        month: 'long',
        day: 'numeric',
      }),
    [selectedDate]
  );

  const meals = reports.filter((r) => r.type === 'meal').length;
  const naps = reports.filter((r) => r.type === 'nap_time').length;
  const nappy = reports.filter((r) => r.type === 'nappy_change').length;
  const activities = reports.filter(
    (r) => r.type !== 'meal' && r.type !== 'nap_time' && r.type !== 'nappy_change'
  ).length;

  const overviewStats = useMemo(
    () => [
      {
        key: 'meals',
        label: 'MEALS',
        value: meals,
        icon: 'restaurant' as const,
        border: colors.accentOrange,
        soft: colors.accentOrangeSoft,
        iconColor: colors.accentOrange,
      },
      {
        key: 'naps',
        label: 'NAPS',
        value: naps,
        icon: 'moon' as const,
        border: colors.accentPurple,
        soft: colors.accentPurpleSoft,
        iconColor: colors.accentPurple,
      },
      {
        key: 'nappy',
        label: 'NAPPY',
        value: nappy,
        icon: 'water' as const,
        border: colors.accentTeal,
        soft: colors.accentTealSoft,
        iconColor: colors.accentTeal,
      },
      {
        key: 'activities',
        label: 'OTHER UPDATES',
        value: activities,
        icon: 'sparkles' as const,
        border: colors.accentPurple,
        soft: colors.accentPurpleSoft,
        iconColor: colors.accentPurple,
      },
    ],
    [meals, naps, nappy, activities, colors]
  );

  const reportAccent = useCallback(
    (type: string) => {
      if (type === 'meal')
        return { soft: colors.accentOrangeSoft, icon: colors.accentOrange };
      if (type === 'nap_time')
        return { soft: colors.accentPurpleSoft, icon: colors.accentPurple };
      if (type === 'nappy_change')
        return { soft: colors.accentTealSoft, icon: colors.accentTeal };
      if (type === 'incident')
        return { soft: colors.accentTealSoft, icon: colors.accentTeal };
      return { soft: colors.accentOrangeSoft, icon: colors.accentOrange };
    },
    [colors]
  );

  const childMetaLine = useMemo(() => {
    const age = selectedChild ? getAge(selectedChild.dateOfBirth) : '';
    const cls = className?.trim();
    if (age && cls) return `${age} · ${cls}`;
    if (cls) return cls;
    return age || 'Your child';
  }, [selectedChild, className]);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { backgroundColor: colors.backgroundSecondary }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.topPad, { paddingTop: homeTopPadding }]}>
          <TouchableOpacity
            style={styles.profileSummaryCard}
            onPress={() =>
              selectedChild &&
              rootStack?.navigate('ChildProfile', {
                childId: selectedChild.id,
                schoolId: selectedChild.schoolId,
              })
            }
            activeOpacity={selectedChild ? 0.92 : 1}
            disabled={!selectedChild}
            accessibilityRole="button"
            accessibilityLabel="Open daily report for this child"
          >
            {selectedChild?.photoURL ? (
              <Image source={{ uri: selectedChild.photoURL }} style={styles.profileSummaryAvatarImg} />
            ) : (
              <View style={[styles.profileSummaryAvatar, { backgroundColor: colors.avatarBg }]}>
                <Text style={[styles.profileSummaryAvatarText, { color: colors.avatarText }]}>
                  {selectedChild ? getInitials(selectedChild.name) : '…'}
                </Text>
              </View>
            )}
            <View style={styles.profileSummaryTextCol}>
              {selectedChild?.name ? (
                <Text style={[styles.profileSummaryName, { color: colors.text }]} numberOfLines={1}>
                  {selectedChild.name}
                </Text>
              ) : (
                <Skeleton width={160} height={18} style={{ marginBottom: 8 }} />
              )}
              <Text style={[styles.profileSummaryMeta, { color: colors.textMuted }]} numberOfLines={1}>
                {selectedChild ? childMetaLine : ' '}
              </Text>
            </View>
          </TouchableOpacity>

          {children.length > 1 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.childChipsContent}
              style={styles.childChipsScroll}
            >
              {children.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.childChip, selectedChildId === c.id && styles.childChipActive]}
                  onPress={() => setSelectedChildId(c.id)}
                >
                  <Text
                    style={[
                      styles.childChipText,
                      selectedChildId === c.id && styles.childChipTextActive,
                    ]}
                  >
                    {c.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : null}

          <TouchableOpacity
            style={styles.ctaCard}
            onPress={() => rootStack?.navigate('ParentAnnouncements')}
            activeOpacity={0.92}
          >
            <View style={styles.ctaIconCircle}>
              <Ionicons name="megaphone" size={26} color={colors.ctaPurple} />
            </View>
            <View style={styles.ctaTextWrap}>
              <Text style={styles.ctaTitle}>School announcements</Text>
              <Text style={styles.ctaSubtitle}>News and reminders from your school</Text>
            </View>
            <Ionicons name="chevron-forward" size={22} color="rgba(255,255,255,0.95)" />
          </TouchableOpacity>
        </View>

        <View style={styles.sectionOverview}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.overviewHeading}>{"Today's Overview"}</Text>
            <View style={styles.dateNav}>
              <TouchableOpacity onPress={prevDay} hitSlop={{ top: 8, bottom: 8, left: 8, right: 4 }}>
                <Ionicons name="chevron-back" size={20} color={colors.textMuted} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.datePill}
                onPress={() => setShowDatePicker(true)}
                activeOpacity={0.7}
              >
                <Text style={styles.datePillText}>{overviewDateLabel}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={nextDay} hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}>
                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          </View>
          {showDatePicker && (
            <>
              <DateTimePicker
                value={new Date(selectedDate + 'T12:00:00')}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={onDatePickerChange}
                maximumDate={maxDate}
              />
              {Platform.OS === 'ios' && (
                <TouchableOpacity style={styles.dateDone} onPress={() => setShowDatePicker(false)}>
                  <Text style={styles.dateDoneText}>Done</Text>
                </TouchableOpacity>
              )}
            </>
          )}
          <View style={styles.statsGrid}>
            {overviewStats.map((s) => (
              <View key={s.key} style={[styles.statCard, { borderTopColor: s.border }]}>
                <View style={[styles.statIconCircle, { backgroundColor: s.soft }]}>
                  <Ionicons name={s.icon} size={22} color={s.iconColor} />
                </View>
                <Text style={styles.statLabel}>{s.label}</Text>
                <Text style={styles.statValue}>{s.value}</Text>
              </View>
            ))}
          </View>
        </View>

        {selectedChild?.assignedTeacherId ? (
          <TouchableOpacity
            style={styles.messageTeacherBtn}
            onPress={onMessageTeacher}
            disabled={messageLoading}
            activeOpacity={0.75}
          >
            <View style={[styles.messageIconCircle, { backgroundColor: colors.accentPurpleSoft }]}>
              {messageLoading ? (
                <ActivityIndicator size="small" color={colors.accentPurple} />
              ) : (
                <Ionicons name="chatbubble-ellipses" size={22} color={colors.accentPurple} />
              )}
            </View>
            <Text style={styles.messageTeacherText}>Message teacher</Text>
          </TouchableOpacity>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{isToday ? "Today's updates" : 'Updates'}</Text>
          {reports.length === 0 ? (
            <Text style={styles.empty}>No updates for this day.</Text>
          ) : (
            reports.map((item) => {
              const accent = reportAccent(item.type);
              return (
                <TouchableOpacity
                  key={item.id}
                  style={styles.updateCard}
                  onPress={() =>
                    selectedChild &&
                    rootStack?.navigate('ReportDetail', {
                      schoolId: selectedChild.schoolId,
                      childId: selectedChild.id,
                      reportId: item.id,
                    })
                  }
                  activeOpacity={0.7}
                  disabled={!selectedChild}
                  accessibilityRole="button"
                >
                  <View style={[styles.updateIconCircle, { backgroundColor: accent.soft }]}>
                    <Ionicons
                      name={reportTypeIconName(item.type)}
                      size={20}
                      color={accent.icon}
                    />
                  </View>
                  <View style={styles.updateCardContent}>
                    <Ionicons style={styles.updateChevron} name="chevron-forward" size={18} color={colors.textMuted} />
                    <Text style={styles.updateType}>{formatParentReportLabel(item.type)}</Text>
                    {item.notes ? (
                      <Text style={styles.updateNotes} numberOfLines={2}>
                        {item.notes}
                      </Text>
                    ) : null}
                    <Text style={styles.updateTime}>{formatTime(item.timestamp)}</Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>

        <View style={styles.bottomPad} />
      </ScrollView>
    </View>
  );
}

function createStyles(colors: import('../../theme/colors').ColorPalette) {
  const f = (weight: 'regular' | 'medium' | 'semiBold' | 'bold') => ({ fontFamily: font[weight] });

  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.backgroundSecondary },
    scroll: { flex: 1, backgroundColor: colors.backgroundSecondary },
    scrollContent: { paddingBottom: 28, flexGrow: 1 },
    bottomPad: { height: 20 },

    topPad: {
      paddingBottom: 8,
      backgroundColor: colors.backgroundSecondary,
    },
    profileSummaryCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      marginHorizontal: 16,
      marginBottom: 0,
      padding: 14,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    profileSummaryAvatar: {
      width: 52,
      height: 52,
      borderRadius: 26,
      alignItems: 'center',
      justifyContent: 'center',
    },
    profileSummaryAvatarImg: {
      width: 52,
      height: 52,
      borderRadius: 26,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    profileSummaryAvatarText: { fontSize: 18, ...f('bold') },
    profileSummaryTextCol: { flex: 1, marginLeft: 14, minWidth: 0 },
    profileSummaryName: { fontSize: 17, ...f('bold') },
    profileSummaryMeta: { fontSize: 14, marginTop: 4, ...f('regular') },

    childChipsScroll: {
      marginTop: 10,
      marginBottom: 0,
      maxHeight: 44,
    },
    childChipsContent: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      gap: 8,
    },
    childChip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      backgroundColor: colors.card,
    },
    childChipActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primaryMuted,
    },
    childChipText: { fontSize: 14, color: colors.textSecondary, ...f('medium') },
    childChipTextActive: { color: colors.primary, ...f('semiBold') },

    ctaCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.ctaPurple,
      borderRadius: 20,
      paddingVertical: 18,
      paddingHorizontal: 18,
      gap: 14,
      marginHorizontal: 16,
      marginTop: 16,
    },
    ctaIconCircle: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
    },
    ctaTextWrap: { flex: 1 },
    ctaTitle: { fontSize: 17, color: '#FFFFFF', ...f('bold') },
    ctaSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.88)', marginTop: 4, ...f('medium') },

    sectionOverview: { marginTop: 12, paddingHorizontal: 20 },
    sectionTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
      flexWrap: 'wrap',
      gap: 10,
    },
    overviewHeading: { fontSize: 17, color: colors.text, ...f('bold') },
    dateNav: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    datePill: {
      backgroundColor: colors.card,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    datePillText: { fontSize: 13, color: colors.textSecondary, ...f('semiBold') },
    dateDone: {
      marginTop: 8,
      paddingVertical: 12,
      alignItems: 'center',
      backgroundColor: colors.primary,
      borderRadius: 14,
    },
    dateDoneText: { color: colors.primaryContrast, ...f('semiBold'), fontSize: 16 },

    statsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    statCard: {
      width: '47%',
      flexGrow: 1,
      minWidth: '45%',
      backgroundColor: colors.card,
      borderRadius: 18,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderTopWidth: 3,
      shadowColor: '#0f172a',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 6,
      elevation: 3,
    },
    statIconCircle: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 10,
    },
    statLabel: {
      fontSize: 10,
      color: colors.textMuted,
      letterSpacing: 0.6,
      ...f('semiBold'),
    },
    statValue: { fontSize: 28, color: colors.text, marginTop: 6, ...f('bold') },

    section: { marginTop: 20, paddingHorizontal: 20 },
    sectionTitle: { fontSize: 17, color: colors.text, marginBottom: 14, ...f('bold') },
    quickGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    quickActionBtn: {
      width: '30%',
      flexGrow: 1,
      minWidth: '28%',
      backgroundColor: colors.card,
      paddingVertical: 16,
      paddingHorizontal: 8,
      borderRadius: 18,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    quickIconCircle: {
      width: 52,
      height: 52,
      borderRadius: 26,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 10,
    },
    quickActionLabel: {
      fontSize: 12,
      color: colors.textSecondary,
      textAlign: 'center',
      ...f('semiBold'),
    },

    messageTeacherBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginHorizontal: 20,
      marginTop: 20,
      paddingVertical: 16,
      paddingHorizontal: 20,
      backgroundColor: colors.card,
      borderRadius: 18,
      gap: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    messageIconCircle: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
    },
    messageTeacherText: {
      fontSize: 16,
      color: colors.text,
      ...f('medium'),
    },

    updateCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: colors.card,
      padding: 14,
      borderRadius: 16,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    updateIconCircle: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    updateCardContent: { flex: 1, minWidth: 0, position: 'relative', paddingRight: 22 },
    updateChevron: {
      position: 'absolute',
      top: 0,
      right: 0,
    },
    updateTime: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 6,
      ...f('medium'),
    },
    updateType: {
      fontSize: 15,
      color: colors.text,
      marginTop: 4,
      ...f('semiBold'),
    },
    updateNotes: {
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: 6,
      lineHeight: 20,
      ...f('regular'),
    },
    empty: { color: colors.textMuted, textAlign: 'center', marginTop: 8, ...f('medium') },
  });
}
