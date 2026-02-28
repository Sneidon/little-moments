import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { collection, getDocs } from 'firebase/firestore';

import { db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { DateBar } from '../../components/DateBar';
import {
  Skeleton,
  SkeletonCircle,
  SkeletonStatCard,
  SkeletonStudentCard,
} from '../../components/Skeleton';
import { useDateNavigation, useTeacherClassChildren } from '../../hooks';
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
  const [reportsToday, setReportsToday] = useState(0);
  const [mealsToday, setMealsToday] = useState(0);
  const [presentCount, setPresentCount] = useState(0);
  const [presentChildIds, setPresentChildIds] = useState<Set<string>>(new Set());

  const { children, className, loading } = useTeacherClassChildren(refreshTrigger);
  const {
    selectedDate,
    showDatePicker,
    setShowDatePicker,
    prevDay,
    nextDay,
    onDatePickerChange,
    displayDate,
    maxDate,
  } = useDateNavigation();

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

  // Today's stats: present count, meals, total reports
  useEffect(() => {
    const schoolId = profile?.schoolId;
    if (!schoolId || children.length === 0) {
      setReportsToday(0);
      setMealsToday(0);
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
      let total = 0;
      let meals = 0;
      const presentIds = new Set<string>();
      for (const child of children) {
        const snap = await getDocs(
          collection(db, 'schools', schoolId, 'children', child.id, 'reports')
        );
        snap.docs.forEach((d) => {
          const data = d.data() as { timestamp?: unknown; createdAt?: unknown; type?: string };
          const ts = toIso(data.timestamp) || toIso(data.createdAt);
          if (ts && ts >= dayStart && ts <= dayEnd) {
            total++;
            if (data.type === 'meal') meals++;
            presentIds.add(child.id);
          }
        });
      }
      if (!cancelled) {
        setReportsToday(total);
        setMealsToday(meals);
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
      color: '#ea580c',
      onPress: () => navigation.navigate('AddUpdate', { initialType: 'meal' }),
    },
    {
      id: 'nap',
      label: 'Log Nap',
      icon: 'bed' as const,
      color: '#7c3aed',
      onPress: () => navigation.navigate('AddUpdate', { initialType: 'nap_time' }),
    },
    {
      id: 'nappy',
      label: 'Log Nappy',
      icon: 'water' as const,
      color: '#0d9488',
      onPress: () => navigation.navigate('AddUpdate', { initialType: 'nappy_change' }),
    },
    {
      id: 'activity',
      label: 'Add Activity',
      icon: 'sparkles' as const,
      color: '#2563eb',
      onPress: () => navigation.navigate('AddUpdate', { initialType: 'medication' }),
    },
    {
      id: 'photo',
      label: 'Add Photo',
      icon: 'camera' as const,
      color: '#db2777',
      onPress: () => navigation.navigate('AddUpdate', { initialType: 'incident' }),
    },
    {
      id: 'planned',
      label: 'Planned activity',
      icon: 'megaphone' as const,
      color: '#16a34a',
      onPress: () => rootStack?.navigate('DailyCommunication'),
    },
    {
      id: 'message',
      label: 'Message Parent',
      icon: 'chatbubble' as const,
      color: '#0891b2',
      onPress: () => rootStack?.navigate('Announcements'),
    },
  ];

  const isChildPresentToday = (childId: string): boolean => presentChildIds.has(childId);

  if (initialLoading) {
    return (
      <View style={styles.container}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={[styles.header, { paddingTop: Math.max(56, insets.top + 12) }]}>
            <View style={styles.headerProfile}>
              <SkeletonCircle size={48} />
              <View style={{ marginLeft: 14 }}>
                <Skeleton width={140} height={20} style={{ marginBottom: 6 }} />
                <Skeleton width={80} height={14} />
              </View>
            </View>
          </View>
          <View style={styles.dateBar}>
            <Skeleton width={32} height={24} />
            <Skeleton width={120} height={20} />
            <Skeleton width={32} height={24} />
          </View>
          <View style={styles.section}>
            <Skeleton width={160} height={18} style={{ marginBottom: 12 }} />
            <View style={styles.statsRow}>
              {[1, 2, 3, 4].map((i) => (
                <SkeletonStatCard key={i} />
              ))}
            </View>
          </View>
          <View style={styles.section}>
            <Skeleton width={120} height={18} style={{ marginBottom: 12 }} />
            <View style={styles.quickActionsGrid}>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <View key={i} style={styles.quickActionBtn}>
                  <SkeletonCircle size={48} />
                  <Skeleton width={64} height={12} style={{ marginTop: 8 }} />
                </View>
              ))}
            </View>
          </View>
          <View style={styles.section}>
            <Skeleton width={140} height={18} style={{ marginBottom: 12 }} />
            {[1, 2, 3, 4].map((i) => (
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
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header: gradient-style (solid purple) with profile and Teacher tag */}
        <View style={[styles.header, { paddingTop: Math.max(56, insets.top + 12) }]}>
          <View style={styles.headerProfile}>
            <View style={styles.avatarLarge}>
              <Text style={styles.avatarLargeText}>{getInitials(teacherName)}</Text>
            </View>
            <View style={styles.headerText}>
              <Text style={styles.headerName}>{teacherName}</Text>
              <Text style={styles.headerClass}>{className || 'My class'}</Text>
            </View>
          </View>
          <View style={styles.roleTag}>
            <Text style={styles.roleTagText}>Teacher</Text>
          </View>
        </View>

        <DateBar
          selectedDate={selectedDate}
          displayDate={displayDate}
          onPrevDay={prevDay}
          onNextDay={nextDay}
          onOpenPicker={() => setShowDatePicker(true)}
          showPicker={showDatePicker}
          onPickerChange={onDatePickerChange}
          onClosePicker={() => setShowDatePicker(false)}
          maxDate={maxDate}
        />

        {/* Today's Overview */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{"Today's Overview"}</Text>
          </View>
          <View style={styles.statsRow}>
            <View style={[styles.statCard, styles.statPresent]}>
              <Text style={[styles.statValue, styles.statPresentValue]}>{presentCount}</Text>
              <Text style={styles.statLabel}>Present</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{children.length}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={[styles.statCard, styles.statMeals]}>
              <Text style={[styles.statValue, styles.statMealsValue]}>{mealsToday}</Text>
              <Text style={styles.statLabel}>Meals</Text>
            </View>
            <View style={[styles.statCard, styles.statPhotos]}>
              <Text style={[styles.statValue, styles.statPhotosValue]}>0</Text>
              <Text style={styles.statLabel}>Photos</Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            {quickActions.map((action) => (
              <TouchableOpacity
                key={action.id}
                style={styles.quickActionBtn}
                onPress={action.onPress}
                activeOpacity={0.7}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: action.color }]}>
                  <Ionicons name={action.icon} size={24} color={colors.primaryContrast} />
                </View>
                <Text style={styles.quickActionLabel}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* My Students */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>My Students ({children.length})</Text>
          {children.length === 0 ? (
            <Text style={styles.empty}>No children assigned yet.</Text>
          ) : (
            children.map((item) => (
              <View key={item.id}>
                {renderChild({ item })}
              </View>
            ))
          )}
        </View>

        <View style={styles.bottomPad} />
      </ScrollView>
    </View>
  );
}

function createStyles(colors: import('../../theme/colors').ColorPalette) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.backgroundSecondary },
    scroll: { flex: 1 },
    scrollContent: { paddingBottom: 24 },
    bottomPad: { height: 24 },

    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 20,
      backgroundColor: colors.header,
    },
    headerProfile: { flexDirection: 'row', alignItems: 'center', flex: 1 },
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
    avatarLargeText: { fontSize: 18, fontWeight: '700', color: colors.headerText },
    headerText: { marginLeft: 14 },
    headerName: { fontSize: 20, fontWeight: '700', color: colors.headerText },
    headerClass: { fontSize: 14, color: colors.headerTextMuted, marginTop: 2 },
    roleTag: {
      backgroundColor: colors.headerAccent,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
    },
    roleTagText: { fontSize: 13, fontWeight: '600', color: colors.headerText },

    dateBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.card,
      marginHorizontal: 16,
      marginTop: 16,
      paddingVertical: 12,
      paddingHorizontal: 8,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    section: { marginTop: 24, paddingHorizontal: 16 },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.textSecondary, marginBottom: 12 },

    statsRow: { flexDirection: 'row', gap: 10 },
    statCard: {
      flex: 1,
      backgroundColor: colors.card,
      padding: 14,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      alignItems: 'center',
    },
    statValue: { fontSize: 26, fontWeight: '800', color: colors.textSecondary },
    statLabel: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
    statPresent: {},
    statPresentValue: { color: colors.success },
    statMeals: {},
    statMealsValue: { color: colors.warning },
    statPhotos: {},
    statPhotosValue: { color: '#db2777' },

    quickActionsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    quickActionBtn: {
      width: '31%',
      backgroundColor: colors.card,
      padding: 14,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      alignItems: 'center',
    },
    quickActionIcon: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
    },
    quickActionLabel: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, textAlign: 'center' },

    studentCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      padding: 14,
      borderRadius: 12,
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
    avatarText: { fontSize: 16, fontWeight: '700', color: colors.avatarText },
    studentCardContent: { flex: 1 },
    studentName: { fontSize: 16, fontWeight: '700', color: colors.textSecondary },
    studentAge: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
    presentBadge: {
      backgroundColor: colors.success,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
    },
    presentBadgeAbsent: { backgroundColor: colors.textMuted },
    presentBadgeText: { fontSize: 12, fontWeight: '600', color: colors.primaryContrast },

    empty: { color: colors.textMuted, textAlign: 'center', marginTop: 8 },
  });
}
