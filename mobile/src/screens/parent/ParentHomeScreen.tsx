import React, { useMemo } from 'react';
import { Platform, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles, type Theme } from '../../hooks/useThemedStyles';
import { useTabBarClearance } from '../../hooks/useTabBarClearance';
import { useDateNavigation } from '../../hooks/useDateNavigation';
import { useNotificationNavigation } from '../../hooks/useNotificationNavigation';
import { NO_TEACHER_ALERT, useOpenChat } from '../../hooks/useOpenChat';
import { OutlineButton } from '../../components/brand/Buttons';
import { CtaCard } from '../../components/brand/CtaCard';
import { DashboardHeader } from '../../components/brand/DashboardHeader';
import { DayOverview, ReportTimeline, summarizeDay, useMealOptionImages } from '../../features/daily-report';
import { brandFont } from '../../theme/typography';
import { spacing, type as typeTokens } from '../../theme/tokens';
import { getAge } from '../../utils';
import { resolveReportImageUrl } from '../../utils/childDailyReportDisplay';
import type { RootStackParamList } from '../../navigation/types';
import { ChildChips } from './home/ChildChips';
import { useOnboardingTour } from './home/useOnboardingTour';
import { useParentHomeData } from './home/useParentHomeData';

function metaLine(dateOfBirth: string | undefined, className: string | null): string {
  return [dateOfBirth ? getAge(dateOfBirth) : null, className?.trim()].filter(Boolean).join(' · ') || 'Your child';
}

export function ParentHomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { brand } = useTheme();
  const styles = useThemedStyles(createStyles);
  const tabBarClearance = useTabBarClearance();
  const dates = useDateNavigation();
  const { children, selectedChild, selectedChildId, setSelectedChildId, className, reports, refreshing, onRefresh } =
    useParentHomeData(dates.selectedDate);
  const mealImages = useMealOptionImages(selectedChild?.schoolId);
  const { openChat, openingChildId } = useOpenChat();
  useNotificationNavigation(true);
  useOnboardingTour();

  const summary = useMemo(() => summarizeDay(reports, dates.selectedDate, 'parent'), [reports, dates.selectedDate]);
  const childRef = selectedChild ? { childId: selectedChild.id, schoolId: selectedChild.schoolId } : null;
  const loading = !selectedChild;
  const dateLabel = new Date(dates.selectedDate + 'T12:00:00').toLocaleDateString(undefined, { month: 'long', day: 'numeric' });

  return (
    <ScrollView
      style={styles.screen}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={brand.onHeader} colors={[brand.headerBackground]} />}
      showsVerticalScrollIndicator={false}
    >
      <DashboardHeader
        name={selectedChild?.name ?? ' '}
        meta={selectedChild ? metaLine(selectedChild.dateOfBirth, className) : ' '}
        photoURL={selectedChild?.photoURL}
        dateLabel={dateLabel}
        onPrevDay={dates.prevDay}
        onNextDay={dates.nextDay}
        onPickDate={() => dates.setShowDatePicker(true)}
        onNotifications={() => navigation.navigate('UserNotifications')}
        onPressProfile={childRef ? () => navigation.navigate('ChildProfile', childRef) : undefined}
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

      <View style={[styles.body, !dates.showDatePicker && styles.overlap, { paddingBottom: tabBarClearance }]}>
        <CtaCard
          icon="megaphone"
          title="Announcements"
          subtitle="News and reminders from school"
          onPress={() => navigation.navigate('ParentAnnouncements')}
        />
        <ChildChips children={children} selectedId={selectedChildId} onSelect={setSelectedChildId} />

        <DayOverview loading={loading} {...summary} />

        {selectedChild?.assignedTeacherId ? (
          <OutlineButton
            label="Message teacher"
            icon="chatbubbles-outline"
            style={styles.message}
            loading={openingChildId === selectedChild.id}
            onPress={() =>
              openChat({
                schoolId: selectedChild.schoolId,
                childId: selectedChild.id,
                otherParticipantId: selectedChild.assignedTeacherId,
                ...NO_TEACHER_ALERT,
              })
            }
          />
        ) : null}

        <Text style={styles.section} accessibilityRole="header">
          {dates.isToday ? "Today's updates" : `Updates · ${dateLabel}`}
        </Text>
        <ReportTimeline
          items={summary.items}
          loading={loading}
          emptySubtitle="Updates from your child's teacher will appear here."
          imageFor={(item) => resolveReportImageUrl(item, mealImages)}
          onPressItem={(item) => childRef && navigation.navigate('ReportDetail', { ...childRef, reportId: item.id })}
        />
      </View>
    </ScrollView>
  );
}

const createStyles = ({ brand }: Theme) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: brand.background },
    picker: { paddingHorizontal: spacing.screenX, paddingTop: 12 },
    done: { alignSelf: 'flex-end', minHeight: 44, paddingHorizontal: 16, justifyContent: 'center' },
    doneText: { fontFamily: brandFont.body800, fontSize: 16, color: brand.textPrimary },
    body: { paddingHorizontal: spacing.screenX, paddingTop: spacing.gapM, gap: spacing.gapM },
    overlap: { marginTop: -44 - spacing.gapM },
    section: { ...typeTokens.section, color: brand.textPrimary, marginTop: 10, marginHorizontal: 4 },
    message: { marginTop: 6 },
  });
