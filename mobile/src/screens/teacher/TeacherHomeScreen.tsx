import React, { useEffect, useState, useCallback, useMemo, useLayoutEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  const tabNavigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [refreshing, setRefreshing] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [initialLoading, setInitialLoading] = useState(true);
  const [mealsToday, setMealsToday] = useState(0);
  const [photosToday, setPhotosToday] = useState(0);
  const [presentCount, setPresentCount] = useState(0);
  const [presentChildIds, setPresentChildIds] = useState<Set<string>>(new Set());

  const { children, className, schoolName, loading } = useTeacherClassChildren(refreshTrigger);
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

  const daycareDisplay = schoolName?.trim() || 'Daycare center';
  const classDisplay = className?.trim() || 'My class';

  useLayoutEffect(() => {
    const nav = tabNavigation as typeof navigation;
    const headerColors = colors;
    const dark = isDark;
    nav.setOptions({
      headerShown: true,
      headerShadowVisible: false,
      headerStyle: {
        backgroundColor: headerColors.backgroundSecondary,
        height: undefined,
      },
      header: () => (
        <View
          style={{
            backgroundColor: headerColors.backgroundSecondary,
            paddingTop: insets.top,
            paddingHorizontal: 16,
            paddingBottom: 12,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: headerColors.card,
              borderRadius: 18,
              paddingVertical: 14,
              paddingHorizontal: 16,
              borderWidth: dark ? StyleSheet.hairlineWidth : 1,
              borderColor: headerColors.cardBorder,
              ...(!dark
                ? {
                    shadowColor: '#0f172a',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.08,
                    shadowRadius: 12,
                    elevation: 5,
                  }
                : {}),
            }}
          >
            <View style={{ flex: 1, marginRight: 12, minWidth: 0 }}>
              <Text
                numberOfLines={1}
                style={{
                  fontFamily: font.bold,
                  fontSize: 17,
                  color: headerColors.text,
                }}
              >
                {daycareDisplay}
              </Text>
              <Text
                style={{
                  fontFamily: font.medium,
                  fontSize: 14,
                  color: headerColors.textMuted,
                  marginTop: 4,
                }}
              >
                Class:{' '}
                <Text style={{ color: headerColors.textSecondary, fontFamily: font.semiBold }}>{classDisplay}</Text>
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => nav.navigate('MessagesList' as never)}
              activeOpacity={0.7}
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: headerColors.card,
                borderWidth: dark ? StyleSheet.hairlineWidth : 1,
                borderColor: headerColors.cardBorder,
              }}
            >
              <Ionicons
                name="notifications-outline"
                size={22}
                color={dark ? headerColors.textSecondary : headerColors.text}
              />
            </TouchableOpacity>
          </View>
        </View>
      ),
    });
  }, [
    tabNavigation,
    daycareDisplay,
    classDisplay,
    colors,
    isDark,
    insets.top,
  ]);

  useEffect(() => {
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

    const check = async () => {
      let meals = 0;
      let photos = 0;
      const presentIds = new Set<string>();
      for (const child of children) {
        const snap = await getDocs(
          collection(db, 'schools', schoolId, 'children', child.id, 'reports')
        );
        snap.docs.forEach((d) => {
          const data = d.data() as { timestamp?: unknown; createdAt?: unknown; type?: string };
          const ts = toIso(data.timestamp) || toIso(data.createdAt);
          if (ts && ts >= dayStart && ts <= dayEnd) {
            if (data.type === 'meal') meals++;
            if (data.type === 'incident') photos++;
            presentIds.add(child.id);
          }
        });
      }
      if (!cancelled) {
        setMealsToday(meals);
        setPhotosToday(photos);
        setPresentCount(presentIds.size);
        setPresentChildIds(presentIds);
      }
    };
    check();
    return () => {
      cancelled = true;
    };
  }, [profile?.schoolId, children, selectedDate, refreshTrigger]);

  const teacherName = profile?.displayName?.trim() || profile?.email?.split('@')[0] || 'Teacher';
  const rootStack = navigation.getParent();

  const quickActions = [
    {
      id: 'meal',
      label: 'Log Meal',
      icon: 'restaurant' as const,
      soft: colors.accentOrangeSoft,
      iconColor: colors.accentOrange,
      onPress: () => navigation.navigate('AddUpdate', { initialType: 'meal' }),
    },
    {
      id: 'nap',
      label: 'Log Nap',
      icon: 'moon' as const,
      soft: colors.accentPurpleSoft,
      iconColor: colors.accentPurple,
      onPress: () => navigation.navigate('AddUpdate', { initialType: 'nap_time' }),
    },
    {
      id: 'nappy',
      label: 'Log Nappy',
      icon: 'water' as const,
      soft: colors.accentTealSoft,
      iconColor: colors.accentTeal,
      onPress: () => navigation.navigate('AddUpdate', { initialType: 'nappy_change' }),
    },
    {
      id: 'activity',
      label: 'Add Activity',
      icon: 'color-palette' as const,
      soft: colors.accentOrangeSoft,
      iconColor: colors.accentOrange,
      onPress: () => navigation.navigate('AddUpdate', { initialType: 'medication' }),
    },
    {
      id: 'photo',
      label: 'Add Photo',
      icon: 'camera' as const,
      soft: colors.accentTealSoft,
      iconColor: colors.accentTeal,
      onPress: () => navigation.navigate('AddUpdate', { initialType: 'incident' }),
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
            <View style={styles.profileRow}>
              <SkeletonCircle size={56} />
              <View style={{ marginLeft: 14, flex: 1 }}>
                <Skeleton width={160} height={20} style={{ marginBottom: 8 }} />
                <Skeleton width={88} height={16} />
              </View>
            </View>
            <Skeleton width="100%" height={72} style={{ borderRadius: 20, marginTop: 8 }} />
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
          <Text style={styles.presentBadgeText}>{present ? 'Present' : '—'}</Text>
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
          <View style={styles.profileRow}>
            <View style={styles.avatarWrap}>
              <View style={styles.avatarLarge}>
                <Text style={styles.avatarLargeText}>{getInitials(teacherName)}</Text>
              </View>
              <View style={styles.onlineDot} />
            </View>
            <View style={styles.profileText}>
              <Text style={styles.headerName}>{teacherName}</Text>
              <View style={styles.roleRow}>
                <View style={styles.rolePill}>
                  <Text style={styles.rolePillText}>TEACHER</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Add Daily Update CTA */}
          <TouchableOpacity
            style={styles.ctaCard}
            onPress={() => navigation.navigate('AddUpdate')}
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
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 8,
      backgroundColor: colors.backgroundSecondary,
    },

    profileRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    avatarWrap: { position: 'relative' },
    avatarLarge: {
      width: 56,
      height: 56,
      borderRadius: 16,
      backgroundColor: colors.avatarBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarLargeText: { fontSize: 20, color: colors.avatarText, ...f('bold') },
    onlineDot: {
      position: 'absolute',
      right: 2,
      bottom: 2,
      width: 14,
      height: 14,
      borderRadius: 7,
      backgroundColor: colors.online,
      borderWidth: 2,
      borderColor: colors.backgroundSecondary,
    },
    profileText: { marginLeft: 14, flex: 1 },
    headerName: { fontSize: 18, color: colors.text, ...f('bold') },
    roleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 8 },
    rolePill: {
      backgroundColor: colors.primaryMuted,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 20,
    },
    rolePillText: { fontSize: 10, color: colors.primary, letterSpacing: 0.8, ...f('semiBold') },

    ctaCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.ctaPurple,
      borderRadius: 20,
      paddingVertical: 18,
      paddingHorizontal: 18,
      gap: 14,
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
    /** Same surface as page — no extra band above stats */
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
