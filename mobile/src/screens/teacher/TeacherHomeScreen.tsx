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
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { collection, getDocs } from 'firebase/firestore';

import { db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { brandFont } from '../../theme/typography';
import { Skeleton } from '../../components/Skeleton';
import { NotificationBellButton } from '../../components/NotificationBellButton';
import { HeaderBlock, Overline } from '../../components/brand/HeaderBlock';
import { RoundIconButton } from '../../components/brand/RoundIconButton';
import { OutlineButton } from '../../components/brand/Buttons';
import { StatTile } from '../../components/brand/StatTile';
import { BrandSkeletonStudentCard, BrandSkeletonTile } from '../../components/brand/BrandSkeletons';
import {
  avatarCategoryColor,
  NATIVE_TAB_BAR_CLEARANCE_IOS,
  radius,
  spacing,
  type as typeTokens,
  updateTypeStyle,
  type BrandPalette,
  type CategoryPalette,
} from '../../theme/tokens';
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
  const { profile } = useAuth();
  const { colors, brand, category, isDark } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const tabBarClearance = Platform.OS === 'ios' ? insets.bottom + NATIVE_TAB_BAR_CLEARANCE_IOS : 24;
  const styles = useMemo(
    () => createStyles(brand, category, isDark, windowWidth),
    [brand, category, isDark, windowWidth]
  );

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

  /** Existing quick actions (all 8, existing labels), coloured by update category. */
  const quickActions: { id: string; label: string; typeKey: string; onPress: () => void }[] = [
    {
      id: 'check_in',
      label: 'Check in',
      typeKey: 'check_in',
      onPress: () => rootStack?.navigate('AddUpdate', { initialType: 'check_in' }),
    },
    {
      id: 'meal',
      label: 'Log Meal',
      typeKey: 'meal',
      onPress: () => rootStack?.navigate('AddUpdate', { initialType: 'meal' }),
    },
    {
      id: 'nap',
      label: 'Log Nap',
      typeKey: 'nap_time',
      onPress: () => rootStack?.navigate('AddUpdate', { initialType: 'nap_time' }),
    },
    {
      id: 'nappy',
      label: 'Log Nappy',
      typeKey: 'nappy_change',
      onPress: () => rootStack?.navigate('AddUpdate', { initialType: 'nappy_change' }),
    },
    {
      id: 'medication',
      label: 'Log Medication',
      typeKey: 'medication',
      onPress: () => rootStack?.navigate('AddUpdate', { initialType: 'medication' }),
    },
    {
      id: 'activity',
      label: 'Add Activity',
      typeKey: 'activity',
      onPress: () => rootStack?.navigate('AddUpdate', { initialType: 'activity' }),
    },
    {
      id: 'photo',
      label: 'Add Photo',
      typeKey: 'incident',
      onPress: () => rootStack?.navigate('AddUpdate', { initialType: 'incident' }),
    },
    {
      id: 'planned',
      label: 'Planned',
      typeKey: 'planned',
      onPress: () => rootStack?.navigate('DailyCommunication'),
    },
  ];

  const isChildPresentToday = (childId: string): boolean => presentChildIds.has(childId);

  const header = (
    <HeaderBlock paddingBottom={72} gap={30}>
      <View style={styles.profileRow}>
        {profile?.photoURL ? (
          <Image source={{ uri: profile.photoURL }} style={styles.profileAvatar} />
        ) : (
          <View style={styles.profileAvatar}>
            <Text style={styles.profileAvatarText}>{getInitials(teacherName).slice(0, 1)}</Text>
          </View>
        )}
        <View style={styles.profileTextCol}>
          <Text style={styles.profileName} numberOfLines={1}>
            {teacherName}
          </Text>
          <Text style={styles.profileMeta} numberOfLines={1}>
            {teacherMetaLine}
          </Text>
        </View>
        <NotificationBellButton
          variant="header"
          colors={colors}
          onPress={() => rootStack?.navigate('UserNotifications')}
        />
      </View>
      <View style={styles.dateRow}>
        <TouchableOpacity
          style={styles.dateTextCol}
          onPress={() => setShowDatePicker(true)}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel={`Today's overview, ${overviewDateLabel}. Choose a date`}
        >
          <Overline>{"Today's Overview"}</Overline>
          <Text style={styles.dateDisplay} numberOfLines={1} adjustsFontSizeToFit>
            {overviewDateLabel}
          </Text>
        </TouchableOpacity>
        <View style={styles.dateButtons}>
          <RoundIconButton icon="chevron-back" variant="onHeader" accessibilityLabel="Previous day" onPress={prevDay} />
          <RoundIconButton icon="chevron-forward" variant="onHeader" accessibilityLabel="Next day" onPress={nextDay} />
        </View>
      </View>
    </HeaderBlock>
  );

  if (initialLoading) {
    return (
      <View style={styles.container}>
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} accessibilityState={{ busy: true }}>
          {header}
          <View style={[styles.body, { paddingBottom: tabBarClearance }]}>
            <Skeleton height={88} borderRadius={radius.cardL} style={{ marginTop: -44 }} />
            <BrandSkeletonTile height={200} />
            <View style={styles.row}>
              <BrandSkeletonTile height={170} />
              <BrandSkeletonTile height={170} />
            </View>
            <Skeleton width={160} height={24} borderRadius={8} style={styles.sectionTitle} />
            <View style={styles.quickGrid}>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} width={styles.quickTile.width as number} height={112} borderRadius={24} />
              ))}
            </View>
            {[1, 2, 3].map((i) => (
              <BrandSkeletonStudentCard key={i} compact />
            ))}
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={brand.onHeader}
            colors={[brand.headerBackground]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {header}

        {showDatePicker && (
          <View style={styles.datePickerWrap}>
            <DateTimePicker
              value={new Date(selectedDate + 'T12:00:00')}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onDatePickerChange}
              maximumDate={maxDate}
            />
            {Platform.OS === 'ios' && (
              <TouchableOpacity
                style={styles.dateDone}
                onPress={() => setShowDatePicker(false)}
                accessibilityRole="button"
              >
                <Text style={styles.dateDoneText}>Done</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <View style={[styles.body, !showDatePicker && styles.bodyOverlap, { paddingBottom: tabBarClearance }]}>
          {/* Add Daily Update CTA */}
          <TouchableOpacity
            style={styles.ctaCard}
            onPress={() => rootStack?.navigate('AddUpdate')}
            activeOpacity={0.9}
            accessibilityRole="button"
            accessibilityLabel="Add Daily Update. Log attendance, meals, or photos"
          >
            <View style={styles.ctaIconCircle}>
              <Ionicons name="add" size={28} color={category.activity} />
            </View>
            <View style={styles.ctaTextWrap}>
              <Text style={styles.ctaTitle}>Add Daily Update</Text>
              <Text style={styles.ctaSubtitle}>Log attendance, meals, or photos</Text>
            </View>
            <Ionicons name="chevron-forward" size={22} color={category.onCategory} />
          </TouchableOpacity>

          {/* Attendance: Present + Total students */}
          <View
            style={styles.attendanceTile}
            accessible
            accessibilityLabel={`Present: ${presentCount} of ${children.length}. Total students: ${children.length}`}
          >
            <View style={styles.attendanceRing} pointerEvents="none" />
            <View style={styles.attendanceTop}>
              <View style={{ gap: 2, flexShrink: 1 }}>
                <Text style={styles.tileOverline}>Present</Text>
                <Text style={styles.presentValue} numberOfLines={1} adjustsFontSizeToFit>
                  {presentCount}
                  <Text style={styles.presentSuffix}> /{children.length}</Text>
                </Text>
              </View>
              <View style={styles.totalChip}>
                <Text style={styles.totalChipLabel}>Total students</Text>
                <Text style={styles.totalChipValue}>{children.length}</Text>
              </View>
            </View>
            {children.length > 0 ? (
              <View style={styles.presenceDots}>
                {children.map((c) =>
                  isChildPresentToday(c.id) ? (
                    <View key={c.id} style={styles.presenceDotPresent} />
                  ) : (
                    <View key={c.id} style={styles.presenceDotAbsent} />
                  )
                )}
              </View>
            ) : null}
          </View>

          <View style={styles.row}>
            <StatTile size="L" label="Meals logged" value={mealsToday} icon="restaurant-outline" color={category.meal} />
            <StatTile size="L" label="Photos shared" value={photosToday} icon="image-outline" color={category.photo} />
          </View>

          {/* Quick Actions */}
          <Text style={styles.sectionTitle} accessibilityRole="header">
            Quick Actions
          </Text>
          <View style={styles.quickGrid}>
            {quickActions.map((action) => {
              const typeStyle = updateTypeStyle(action.typeKey);
              return (
                <TouchableOpacity
                  key={action.id}
                  style={styles.quickTile}
                  onPress={action.onPress}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel={action.label}
                >
                  <View style={[styles.quickIcon, { backgroundColor: category[typeStyle.category] }]}>
                    <Ionicons name={typeStyle.icon} size={22} color={category.onCategory} />
                  </View>
                  <Text style={styles.quickLabel} numberOfLines={2}>
                    {action.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <OutlineButton
            label="Message Parents"
            icon="chatbubbles-outline"
            style={styles.messageParentsBtn}
            onPress={() => rootStack?.navigate('SelectChildToMessage')}
          />

          <Text style={styles.sectionTitle} accessibilityRole="header">
            My Students ({children.length})
          </Text>
          {children.length === 0 ? (
            <Text style={styles.empty}>No children assigned yet.</Text>
          ) : (
            children.map((item, index) => {
              const present = isChildPresentToday(item.id);
              return (
                <TouchableOpacity
                  key={item.id}
                  style={styles.studentCard}
                  onPress={() => rootStack?.navigate('Reports', { childId: item.id })}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel={`${item.name}, ${getAge(item.dateOfBirth)} old, ${
                    present ? 'present' : 'not checked in'
                  }`}
                >
                  <View style={[styles.studentAvatar, { backgroundColor: avatarCategoryColor(category, index) }]}>
                    <Text style={styles.studentAvatarText}>{getInitials(item.name)}</Text>
                  </View>
                  <View style={styles.studentCardContent}>
                    <Text style={styles.studentName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={styles.studentAge}>{getAge(item.dateOfBirth)} old</Text>
                  </View>
                  <View style={[styles.presentBadge, !present && styles.presentBadgeAbsent]}>
                    <Text style={[styles.presentBadgeText, !present && styles.presentBadgeTextAbsent]}>
                      {present ? 'Present' : '-'}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function createStyles(brand: BrandPalette, category: CategoryPalette, isDark: boolean, windowWidth: number) {
  const ink = category.onCategory;
  // Three quick-action tiles per row inside the page gutters, 10pt apart.
  const quickTileWidth = Math.floor((windowWidth - spacing.screenX * 2 - 10 * 2) / 3);
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: brand.background },
    scroll: { flex: 1 },
    profileRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    profileAvatar: {
      width: 48,
      height: 48,
      borderRadius: 16,
      backgroundColor: category.activity,
      alignItems: 'center',
      justifyContent: 'center',
    },
    profileAvatarText: { fontFamily: brandFont.display800, fontSize: 22, color: ink },
    profileTextCol: { flex: 1, minWidth: 0, gap: 1 },
    profileName: { fontFamily: brandFont.body800, fontSize: 17, color: brand.onHeader },
    profileMeta: { fontFamily: brandFont.body500, fontSize: 13, color: brand.onHeaderMuted },
    dateRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 },
    dateTextCol: { flex: 1, minWidth: 0, gap: 6 },
    dateDisplay: { ...typeTokens.displayXL, color: brand.onHeader },
    dateButtons: { flexDirection: 'row', gap: 8 },
    datePickerWrap: { paddingHorizontal: spacing.screenX, paddingTop: 12 },
    dateDone: { alignSelf: 'flex-end', minHeight: 44, paddingHorizontal: 16, justifyContent: 'center' },
    dateDoneText: { fontFamily: brandFont.body800, fontSize: 16, color: brand.textPrimary },
    body: {
      paddingHorizontal: spacing.screenX,
      paddingTop: spacing.gapM,
      paddingBottom: 24,
      gap: spacing.gapM,
    },
    bodyOverlap: { marginTop: -44 - spacing.gapM },
    row: { flexDirection: 'row', gap: spacing.gapM },
    ctaCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      paddingVertical: 16,
      paddingLeft: 16,
      paddingRight: 18,
      borderRadius: radius.cardL,
      borderWidth: 3,
      borderColor: brand.background,
      backgroundColor: category.activity,
      shadowColor: brand.shadow,
      shadowOffset: { width: 0, height: 14 },
      shadowOpacity: isDark ? 0.7 : 0.45,
      shadowRadius: 14,
      elevation: 8,
    },
    ctaIconCircle: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: ink,
      alignItems: 'center',
      justifyContent: 'center',
    },
    ctaTextWrap: { flex: 1, minWidth: 0, gap: 2 },
    ctaTitle: { ...typeTokens.cardTitle, color: ink },
    ctaSubtitle: { fontFamily: brandFont.body600, fontSize: 14, color: '#4A3D00' },
    attendanceTile: {
      backgroundColor: category.attendance,
      borderRadius: radius.cardL,
      padding: 22,
      gap: 18,
      overflow: 'hidden',
    },
    attendanceRing: {
      position: 'absolute',
      width: 160,
      height: 160,
      borderRadius: 80,
      borderWidth: 22,
      borderColor: 'rgba(255,255,255,0.3)',
      right: -50,
      bottom: -60,
    },
    attendanceTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
    tileOverline: { ...typeTokens.overline, color: ink },
    presentValue: { ...typeTokens.statHero, color: ink },
    presentSuffix: { fontFamily: brandFont.display800, fontSize: 36, letterSpacing: -0.72, color: category.onCategoryMuted },
    totalChip: {
      backgroundColor: 'rgba(255,255,255,0.5)',
      borderRadius: 18,
      paddingVertical: 10,
      paddingHorizontal: 14,
      alignItems: 'flex-end',
    },
    totalChipLabel: {
      fontFamily: brandFont.body800,
      fontSize: 12,
      letterSpacing: 0.72,
      textTransform: 'uppercase',
      color: category.onCategoryMuted,
    },
    totalChipValue: { fontFamily: brandFont.display800, fontSize: 30, lineHeight: 33, color: ink },
    presenceDots: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    presenceDotAbsent: {
      width: 34,
      height: 34,
      borderRadius: 17,
      borderWidth: 2.5,
      borderStyle: 'dashed',
      borderColor: ink,
      opacity: 0.55,
    },
    presenceDotPresent: { width: 34, height: 34, borderRadius: 17, backgroundColor: ink },
    sectionTitle: { ...typeTokens.section, color: brand.textPrimary, marginTop: 10, marginHorizontal: 4 },
    quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    quickTile: {
      width: quickTileWidth,
      gap: 18,
      padding: 14,
      borderRadius: 24,
      backgroundColor: brand.surface,
    },
    quickIcon: {
      width: 48,
      height: 48,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    quickLabel: { fontFamily: brandFont.body800, fontSize: 15, color: brand.textPrimary },
    messageParentsBtn: { marginTop: 6 },
    empty: { ...typeTokens.body, color: brand.textSecondary, marginHorizontal: 4 },
    studentCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      padding: 14,
      borderRadius: radius.card,
      backgroundColor: brand.surface,
    },
    studentAvatar: {
      width: 52,
      height: 52,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    studentAvatarText: { fontFamily: brandFont.display800, fontSize: 20, color: ink },
    studentCardContent: { flex: 1, minWidth: 0, gap: 2 },
    studentName: { fontFamily: brandFont.display800, fontSize: 18, letterSpacing: -0.36, color: brand.textPrimary },
    studentAge: { fontFamily: brandFont.body600, fontSize: 14, color: brand.textSecondary },
    presentBadge: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: radius.pill,
      backgroundColor: brand.statusPresent,
    },
    presentBadgeAbsent: { backgroundColor: brand.surfaceRaised },
    presentBadgeText: { fontFamily: brandFont.body800, fontSize: 13, color: '#FFFFFF' },
    presentBadgeTextAbsent: { color: brand.textTertiary },
  });
}
