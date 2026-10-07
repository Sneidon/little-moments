import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { OutlineButton } from '../../components/brand/Buttons';
import { useDateNavigation, useTeacherClassChildren } from '../../hooks';
import { useNotificationNavigation } from '../../hooks/useNotificationNavigation';
import { brandFont } from '../../theme/typography';
import { NATIVE_TAB_BAR_CLEARANCE_IOS, spacing, type as typeTokens, type BrandPalette } from '../../theme/tokens';
import type { RootStackParamList } from '../../navigation/types';
import { DashboardHeader } from './dashboard/DashboardHeader';
import { DashboardSkeleton } from './dashboard/DashboardSkeleton';
import { AddUpdateCta, OverviewTiles } from './dashboard/OverviewTiles';
import { QuickActions, type QuickAction } from './dashboard/QuickActions';
import { StudentPresenceList } from './dashboard/StudentPresenceList';
import { useDashboardStats } from './dashboard/useDashboardStats';

function metaLine(schoolName: string | null, className: string | null): string {
  return [schoolName?.trim(), className?.trim()].filter(Boolean).join(' · ') || 'Teacher';
}

export function TeacherHomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { profile } = useAuth();
  const { brand } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(brand), [brand]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const { children, loading, className, schoolName } = useTeacherClassChildren(refreshTrigger);
  const dates = useDateNavigation();
  const stats = useDashboardStats(profile?.schoolId, children, dates.selectedDate, refreshTrigger);
  useNotificationNavigation(false);

  useEffect(() => {
    if (!loading) setRefreshing(false);
  }, [loading, children]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setRefreshTrigger((t) => t + 1);
  }, []);

  const onQuickAction = useCallback(
    (action: QuickAction) =>
      action.initialType
        ? navigation.navigate('AddUpdate', { initialType: action.initialType })
        : navigation.navigate('DailyCommunication'),
    [navigation]
  );

  const dateLabel = new Date(dates.selectedDate + 'T12:00:00').toLocaleDateString(undefined, { month: 'long', day: 'numeric' });
  const showSkeleton = loading && children.length === 0 && !!profile?.schoolId;
  const bottom = Platform.OS === 'ios' ? insets.bottom + NATIVE_TAB_BAR_CLEARANCE_IOS : 24;

  return (
    <ScrollView
      style={styles.screen}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={brand.onHeader} colors={[brand.headerBackground]} />}
      showsVerticalScrollIndicator={false}
      accessibilityState={showSkeleton ? { busy: true } : undefined}
    >
      <DashboardHeader
        name={profile?.displayName?.trim() || profile?.email?.split('@')[0] || 'Teacher'}
        meta={metaLine(schoolName, className)}
        photoURL={profile?.photoURL}
        dateLabel={dateLabel}
        onPrevDay={dates.prevDay}
        onNextDay={dates.nextDay}
        onPickDate={() => dates.setShowDatePicker(true)}
        onNotifications={() => navigation.navigate('UserNotifications')}
      />

      {dates.showDatePicker ? (
        <View style={styles.picker}>
          <DateTimePicker
            value={new Date(dates.selectedDate + 'T12:00:00')}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={dates.onDatePickerChange}
            maximumDate={dates.maxDate}
          />
          {Platform.OS === 'ios' ? (
            <TouchableOpacity style={styles.done} onPress={() => dates.setShowDatePicker(false)} accessibilityRole="button">
              <Text style={styles.doneText}>Done</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}

      <View style={[styles.body, !dates.showDatePicker && styles.overlap, { paddingBottom: bottom }]}>
        {showSkeleton ? (
          <DashboardSkeleton />
        ) : (
          <>
            <AddUpdateCta onPress={() => navigation.navigate('AddUpdate')} />
            <OverviewTiles children={children} presentIds={stats.presentIds} meals={stats.meals} photos={stats.photos} />
            <Text style={styles.section} accessibilityRole="header">
              Quick Actions
            </Text>
            <QuickActions onPress={onQuickAction} />
            <OutlineButton
              label="Message Parents"
              icon="chatbubbles-outline"
              style={styles.message}
              onPress={() => navigation.navigate('SelectChildToMessage')}
            />
            <Text style={styles.section} accessibilityRole="header">
              My Students ({children.length})
            </Text>
            <StudentPresenceList
              children={children}
              presentIds={stats.presentIds}
              onPress={(child) => navigation.navigate('Reports', { childId: child.id })}
            />
          </>
        )}
      </View>
    </ScrollView>
  );
}

function createStyles(brand: BrandPalette) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: brand.background },
    picker: { paddingHorizontal: spacing.screenX, paddingTop: 12 },
    done: { alignSelf: 'flex-end', minHeight: 44, paddingHorizontal: 16, justifyContent: 'center' },
    doneText: { fontFamily: brandFont.body800, fontSize: 16, color: brand.textPrimary },
    body: { paddingHorizontal: spacing.screenX, paddingTop: spacing.gapM, gap: spacing.gapM },
    overlap: { marginTop: -44 - spacing.gapM },
    section: { ...typeTokens.section, color: brand.textPrimary, marginTop: 10, marginHorizontal: 4 },
    message: { marginTop: 6 },
  });
}
