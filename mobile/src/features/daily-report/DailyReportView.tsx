import React, { useMemo } from 'react';
import { Platform, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { useDateNavigation } from '../../hooks';
import { Skeleton } from '../../components/Skeleton';
import { brandFont } from '../../theme/typography';
import { spacing, type as typeTokens, type BrandPalette } from '../../theme/tokens';
import type { ReportWithExtras } from '../../utils/childDailyReportDisplay';
import type { Child } from '@shared/types';
import { ChildReportHeader } from './ChildReportHeader';
import { DayOverview } from './DayOverview';
import { ReportTimeline } from './ReportTimeline';
import { summarizeDay, type ReportAudience } from './summary';

type Props = {
  audience: ReportAudience;
  child: Child | null;
  className: string | null;
  childLoading: boolean;
  childMissing: boolean;
  reports: ReportWithExtras[];
  reportsLoading?: boolean;
  missingMessage: string;
  emptySubtitle: string;
  actions: React.ReactNode;
  refreshing: boolean;
  onRefresh: () => void;
  onBack: () => void;
  onPressItem: (item: ReportWithExtras) => void;
  imageFor?: (item: ReportWithExtras) => string | null | undefined;
};

export function DailyReportView({
  audience,
  child,
  className,
  childLoading,
  childMissing,
  reports,
  reportsLoading,
  missingMessage,
  emptySubtitle,
  actions,
  refreshing,
  onRefresh,
  onBack,
  onPressItem,
  imageFor,
}: Props) {
  const insets = useSafeAreaInsets();
  const { brand, category } = useTheme();
  const styles = useMemo(() => createStyles(brand), [brand]);
  const dates = useDateNavigation();
  const summary = useMemo(
    () => summarizeDay(reports, dates.selectedDate, audience),
    [reports, dates.selectedDate, audience]
  );

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ paddingBottom: 24 + Math.max(insets.bottom, 8) }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={category.onCategory} colors={[brand.headerBackground]} />
      }
      showsVerticalScrollIndicator={false}
    >
      <ChildReportHeader
        child={childMissing ? null : child}
        className={className}
        loading={childLoading}
        missingMessage={missingMessage}
        onBack={onBack}
        datePill={{
          label: dates.displayDate,
          onPrev: dates.prevDay,
          onNext: dates.nextDay,
          onPressLabel: () => dates.setShowDatePicker(true),
          nextDisabled: dates.isToday,
        }}
      />

      {dates.showDatePicker ? (
        <>
          <DateTimePicker
            value={new Date(dates.selectedDate + 'T12:00:00')}
            mode="date"
            display={Platform.OS === 'ios' ? 'calendar' : 'default'}
            onChange={dates.onDatePickerChange}
            maximumDate={dates.maxDate}
          />
          {Platform.OS === 'ios' ? (
            <TouchableOpacity style={styles.done} onPress={() => dates.setShowDatePicker(false)} accessibilityRole="button">
              <Text style={styles.doneText}>Done</Text>
            </TouchableOpacity>
          ) : null}
        </>
      ) : null}

      <View style={styles.body}>
        {childLoading || child ? <View style={styles.actions}>{actions}</View> : null}

        <SectionHeading loading={childLoading} title="Today's overview" styles={styles} />
        {childMissing ? (
          <Text style={styles.hint}>Overview unavailable</Text>
        ) : (
          <DayOverview loading={childLoading} {...summary} />
        )}

        <SectionHeading
          loading={childLoading}
          title={dates.isToday ? "Today's Updates" : `Updates · ${dates.displayDate}`}
          styles={styles}
        />
        {childMissing ? (
          <Text style={styles.hint}>No updates to show.</Text>
        ) : (
          <ReportTimeline
            items={summary.items}
            loading={childLoading}
            refreshing={reportsLoading}
            emptySubtitle={emptySubtitle}
            onPressItem={onPressItem}
            imageFor={imageFor}
          />
        )}
      </View>
    </ScrollView>
  );
}

function SectionHeading({
  loading,
  title,
  styles,
}: {
  loading: boolean;
  title: string;
  styles: ReturnType<typeof createStyles>;
}) {
  if (loading) return <Skeleton width={180} height={24} borderRadius={8} style={styles.sectionTitle} />;
  return (
    <Text style={styles.sectionTitle} accessibilityRole="header">
      {title}
    </Text>
  );
}

function createStyles(brand: BrandPalette) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: brand.background },
    done: { alignSelf: 'flex-end', marginRight: spacing.screenX, marginTop: 8, minHeight: 44, paddingHorizontal: 16, justifyContent: 'center' },
    doneText: { fontFamily: brandFont.body800, fontSize: 16, color: brand.textPrimary },
    body: { padding: spacing.screenX, gap: spacing.gapM },
    actions: { flexDirection: 'row', gap: 10 },
    sectionTitle: { ...typeTokens.section, color: brand.textPrimary, marginTop: 10, marginHorizontal: 4 },
    hint: { ...typeTokens.body, color: brand.textSecondary, marginHorizontal: 4 },
  });
}
