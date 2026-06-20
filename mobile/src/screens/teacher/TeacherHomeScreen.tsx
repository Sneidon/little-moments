import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Platform,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { collection, getDocs } from 'firebase/firestore';

import { db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { font } from '../../theme/typography';
import {
  Skeleton,
  SkeletonCircle,
  SkeletonStatCard,
  SkeletonStudentCard,
} from '../../components/Skeleton';
import { useDateNavigation, useTeacherClassChildren } from '../../hooks';
import { useNotificationNavigation } from '../../hooks/useNotificationNavigation';
import { getAge, getInitials } from '../../utils';

import type { Child } from '../../../../shared/types';

export function TeacherHomeScreen({
  navigation,
}: {
  navigation: {
    navigate: (name: string, params?: { childId?: string; initialType?: string }) => void;
    getParent: () => { navigate: (name: string, params?: object) => void } | undefined;
  };
}) {
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [refreshing, setRefreshing] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [initialLoading, setInitialLoading] = useState(true);
  const [mealsToday, setMealsToday] = useState(0);
  const [photosToday, setPhotosToday] = useState(0);
  const [presentCount, setPresentCount] = useState(0);
  const [presentChildIds, setPresentChildIds] = useState<Set<string>>(new Set());

  const { children, loading, className, schoolName } = useTeacherClassChildren(refreshTrigger);
  useNotificationNavigation(false);

  const {
    selectedDate,
    showDatePicker,
    setShowDatePicker,
    prevDay,
    nextDay,
    onDatePickerChange,
    maxDate,
  } = useDateNavigation();

  const overviewDateLabel = useMemo(
    () =>
      new Date(selectedDate + 'T12:00:00').toLocaleDateString(undefined, {
        month: 'long',
        day: 'numeric',
      }),
    [selectedDate]
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setRefreshTrigger((t) => t + 1);
  }, []);

  useEffect(() => {
    if (!profile?.schoolId || !profile?.uid) setInitialLoading(false);
  }, [profile?.schoolId, profile?.uid]);
  useEffect(() => {
    if (!loading) setInitialLoading(false);
  }, [loading]);
  useEffect(() => {
    setRefreshing(false);
  }, [children.length]);

  useFocusEffect(
    useCallback(() => {
      const schoolId = profile?.schoolId;
      if (!schoolId || children.length === 0) {
        setMealsToday(0);
        setPhotosToday(0);
        setPresentCount(0);
        setPresentChildIds(new Set());
        return;
      }

      const dayStart = `${selectedDate}T00:00:00.000Z`;
      const dayEnd = `${selectedDate}T23:59:59.999Z`;
      let cancelled = false;

      const toIso = (ts: unknown): string => {
        if (typeof ts === 'string') return ts;
        if (ts && typeof (ts as { toDate?: () => Date }).toDate === 'function') {
          return (ts as { toDate: () => Date }).toDate().toISOString();
        }
        return '';
      };

      const loadStats = async () => {
        let meals = 0;
        let photos = 0;
        const presentIds = new Set<string>();
        for (const child of children) {
          const snap = await getDocs(
            collection(db, 'schools', schoolId, 'children', child.id, 'reports')
          );
          const dayReports = snap.docs
            .map((d) => {
              const data = d.data() as { timestamp?: unknown; createdAt?: unknown; type?: string };
              const ts = toIso(data.timestamp) || toIso(data.createdAt);
              return { type: data.type, ts };
            })
            .filter((r) => r.ts && r.ts >= dayStart && r.ts <= dayEnd)
            .sort((a, b) => a.ts.localeCompare(b.ts));

          for (const report of dayReports) {
            if (report.type === 'meal') meals++;
            if (report.type === 'incident') photos++;
          }

          let isPresent = false;
          for (const report of dayReports) {
            if (report.type === 'check_in') isPresent = true;
            if (report.type === 'check_out') isPresent = false;
          }
          if (isPresent) presentIds.add(child.id);
        }
        if (!cancelled) {
          setMealsToday(meals);
          setPhotosToday(photos);
          setPresentCount(presentIds.size);
          setPresentChildIds(presentIds);
        }
      };

      void loadStats();
      return () => {
        cancelled = true;
      };
    }, [profile?.schoolId, children, selectedDate, refreshTrigger])
  );

  const teacherName = profile?.displayName?.trim() || profile?.email?.split('@')[0] || 'Teacher';
  const teacherMetaLine = useMemo(() => {
    const s = schoolName?.trim();
    const c = className?.trim();
    if (s && c) return `${s} · ${c}`;
    if (c) return c;
    if (s) return s;
    return 'Teacher';
  }, [schoolName, className]);
  const rootStack = navigation.getParent();

  const quickActions = [
    {
      id: 'meal',
      label: 'Log Meal',
      icon: 'restaurant' as const,
      soft: colors.accentOrangeSoft,
      iconColor: colors.accentOrange,
      onPress: () => rootStack?.navigate('AddUpdate', { initialType: 'meal' }),
    },
    {
      id: 'nap',
      label: 'Log Nap',
      icon: 'moon' as const,
      soft: colors.accentPurpleSoft,
      iconColor: colors.accentPurple,
      onPress: () => rootStack?.navigate('AddUpdate', { initialType: 'nap_time' }),
    },
    {
      id: 'nappy',
      label: 'Log Nappy',
      icon: 'water' as const,
      soft: colors.accentTealSoft,
      iconColor: colors.accentTeal,
      onPress: () => rootStack?.navigate('AddUpdate', { initialType: 'nappy_change' }),
    },
    {
      id: 'medication',
      label: 'Log Medication',
      icon: 'medical' as const,
      soft: colors.primaryMuted,
      iconColor: colors.primary,
      onPress: () => rootStack?.navigate('AddUpdate', { initialType: 'medication' }),
    },
    {
      id: 'activity',
      label: 'Add Activity',
      icon: 'color-palette' as const,
      soft: colors.accentOrangeSoft,
      iconColor: colors.accentOrange,
      onPress: () => rootStack?.navigate('AddUpdate', { initialType: 'activity' }),
    },
    {
      id: 'photo',
      label: 'Add Photo',
      icon: 'camera' as const,
      soft: colors.accentTealSoft,
      iconColor: colors.accentTeal,
      onPress: () => rootStack?.navigate('AddUpdate', { initialType: 'incident' }),
    },
    {
      id: 'planned',
      label: 'Planned',
      icon: 'calendar' as const,
      soft: colors.accentPurpleSoft,
      iconColor: colors.accentPurple,
      onPress: () => rootStack?.navigate('DailyCommunication'),
    },
  ];

  const isChildPresentToday = (childId: string): boolean => presentChildIds.has(childId);

  const overviewStats = [
    {
      key: 'present',
      label: 'PRESENT',
      value: presentCount,
      icon: 'checkmark-circle' as const,
      border: colors.accentPurple,
      soft: colors.accentPurpleSoft,
      iconColor: colors.accentPurple,
    },
    {
      key: 'total',
      label: 'TOTAL STUDENTS',
      value: children.length,
      icon: 'people' as const,
      border: colors.accentTeal,
      soft: colors.accentTealSoft,
      iconColor: colors.accentTeal,
    },
    {
      key: 'meals',
      label: 'MEALS LOGGED',
      value: mealsToday,
      icon: 'restaurant' as const,
      border: colors.accentOrange,
      soft: colors.accentOrangeSoft,
      iconColor: colors.accentOrange,
    },
    {
      key: 'photos',
      label: 'PHOTOS SHARED',
      value: photosToday,
      icon: 'images' as const,
      border: colors.accentPurple,
      soft: colors.accentPurpleSoft,
      iconColor: colors.accentPurple,
    },
  ];

  if (initialLoading) {
    return (
      <View style={styles.container}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { backgroundColor: colors.backgroundSecondary }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.topPad}>
            <View style={styles.profileSummaryCard}>
              <SkeletonCircle size={52} />
              <View style={styles.profileSummaryTextCol}>
                <Skeleton width={160} height={18} style={{ marginBottom: 8 }} />
                <Skeleton width={120} height={14} />
              </View>
            </View>
            <View style={{ marginHorizontal: 16, marginTop: 16 }}>
              <Skeleton width="100%" height={72} style={{ borderRadius: 20 }} />
            </View>
          </View>
          <View style={styles.sectionOverview}>
            <View style={styles.sectionTitleRow}>
              <Skeleton width={140} height={18} />
              <Skeleton width={100} height={32} style={{ borderRadius: 20 }} />
            </View>
            <View style={styles.statsGrid}>
              {[1, 2, 3, 4].map((i) => (
                <SkeletonStatCard key={i} />
              ))}
            </View>
          </View>
          <View style={styles.section}>
            <Skeleton width={120} height={18} style={{ marginBottom: 12 }} />
            <View style={styles.quickGrid}>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <View key={i} style={styles.quickActionBtn}>
                  <SkeletonCircle size={48} />
                  <Skeleton width={64} height={12} style={{ marginTop: 8 }} />
                </View>
              ))}
            </View>
          </View>
          <View style={styles.section}>
            <Skeleton width="100%" height={52} style={{ borderRadius: 16 }} />
          </View>
          <View style={styles.section}>
            <Skeleton width={140} height={18} style={{ marginBottom: 12 }} />
            {[1, 2, 3].map((i) => (
              <SkeletonStudentCard key={i} />
            ))}
          </View>
          <View style={styles.bottomPad} />
        </ScrollView>
      </View>
    );
  }

  const renderChild = ({ item }: { item: Child }) => {
    const present = isChildPresentToday(item.id);
    return (
      <TouchableOpacity
        style={styles.studentCard}
        onPress={() => rootStack?.navigate('Reports', { childId: item.id })}
        activeOpacity={0.7}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{getInitials(item.name)}</Text>
        </View>
        <View style={styles.studentCardContent}>
          <Text style={styles.studentName}>{item.name}</Text>
          <Text style={styles.studentAge}>{getAge(item.dateOfBirth)} old</Text>
        </View>
        <View style={[styles.presentBadge, !present && styles.presentBadgeAbsent]}>
          <Text style={styles.presentBadgeText}>{present ? 'Present' : '-'}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { backgroundColor: colors.backgroundSecondary }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topPad}>
          <View style={styles.profileSummaryCard}>
            {profile?.photoURL ? (
              <Image source={{ uri: profile.photoURL }} style={styles.profileSummaryAvatarImg} />
            ) : (
              <View style={[styles.profileSummaryAvatar, { backgroundColor: colors.avatarBg }]}>
                <Text style={[styles.profileSummaryAvatarText, { color: colors.avatarText }]}>
                  {getInitials(teacherName)}
                </Text>
              </View>
            )}
            <View style={styles.profileSummaryTextCol}>
              <Text style={[styles.profileSummaryName, { color: colors.text }]} numberOfLines={1}>
                {teacherName}
              </Text>
              <Text style={[styles.profileSummaryMeta, { color: colors.textMuted }]} numberOfLines={1}>
                {teacherMetaLine}
              </Text>
            </View>
          </View>

          {/* Add Daily Update CTA */}
          <TouchableOpacity
            style={styles.ctaCard}
            onPress={() => rootStack?.navigate('AddUpdate')}
            activeOpacity={0.92}
          >
            <View style={styles.ctaIconCircle}>
              <Ionicons name="add" size={28} color={colors.ctaPurple} />
            </View>
            <View style={styles.ctaTextWrap}>
              <Text style={styles.ctaTitle}>Add Daily Update</Text>
              <Text style={styles.ctaSubtitle}>Log attendance, meals, or photos</Text>
            </View>
            <Ionicons name="chevron-forward" size={22} color="rgba(255,255,255,0.95)" />
          </TouchableOpacity>
        </View>

        {/* Today's Overview */}
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

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickGrid}>
            {quickActions.map((action) => (
              <TouchableOpacity
                key={action.id}
                style={styles.quickActionBtn}
                onPress={action.onPress}
                activeOpacity={0.7}
              >
                <View style={[styles.quickIconCircle, { backgroundColor: action.soft }]}>
                  <Ionicons name={action.icon} size={24} color={action.iconColor} />
                </View>
                <Text style={styles.quickActionLabel}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity
          style={styles.messageParentsBtn}
          onPress={() => rootStack?.navigate('SelectChildToMessage')}
          activeOpacity={0.75}
        >
          <View style={[styles.messageIconCircle, { backgroundColor: colors.accentPurpleSoft }]}>
            <Ionicons name="chatbubbles" size={22} color={colors.accentPurple} />
          </View>
          <Text style={styles.messageParentsText}>Message Parents</Text>
        </TouchableOpacity>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>My Students ({children.length})</Text>
          {children.length === 0 ? (
            <Text style={styles.empty}>No children assigned yet.</Text>
          ) : (
            children.map((item) => (
              <View key={item.id}>{renderChild({ item })}</View>
            ))
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
      paddingTop: 12,
      paddingBottom: 8,
      backgroundColor: colors.backgroundSecondary,
    },

    /** Matches parent Child profile `profileSummaryCard` */
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

    section: { marginTop: 20, paddingHorizontal: 20 },
    /** Same surface as page; no extra band above stats */
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
    sectionTitle: { fontSize: 17, color: colors.text, marginBottom: 14, ...f('bold') },
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

    quickGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      marginTop: 0,
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

    messageParentsBtn: {
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
    messageParentsText: {
      fontSize: 16,
      color: colors.text,
      ...f('medium'),
    },

    studentCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      padding: 14,
      borderRadius: 16,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    avatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.avatarBg,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    avatarText: { fontSize: 16, color: colors.avatarText, ...f('bold') },
    studentCardContent: { flex: 1 },
    studentName: { fontSize: 16, color: colors.text, ...f('semiBold') },
    studentAge: { fontSize: 13, color: colors.textMuted, marginTop: 2, ...f('medium') },
    presentBadge: {
      backgroundColor: colors.success,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
    },
    presentBadgeAbsent: { backgroundColor: colors.textMuted },
    presentBadgeText: { fontSize: 12, color: '#FFFFFF', ...f('semiBold') },

    empty: { color: colors.textMuted, textAlign: 'center', marginTop: 8, ...f('medium') },
  });
}
