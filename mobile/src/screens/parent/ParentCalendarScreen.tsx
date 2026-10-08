import React, { useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles, type Theme } from '../../hooks/useThemedStyles';
import { useTabBarClearance } from '../../hooks/useTabBarClearance';
import { Skeleton } from '../../components/Skeleton';
import { TabHeader } from '../../components/brand/TabHeader';
import { radius, spacing } from '../../theme/tokens';
import type { RootStackParamList } from '../../navigation/types';
import type { Event } from '@shared/types';
import { indexEventsByDay, toLocalYMD } from './calendar/calendarUtils';
import { DayView } from './calendar/DayView';
import { MonthView } from './calendar/MonthView';
import { UpcomingCard } from './calendar/UpcomingCard';
import { useParentEvents } from './calendar/useParentEvents';
import { ViewModeToggle, type ViewMode } from './calendar/ViewModeToggle';
import { WeekView } from './calendar/WeekView';

function today() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function ParentCalendarScreen() {
  const tabBarClearance = useTabBarClearance();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { brand } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { schoolId, events, nowMs, refreshing, onRefresh } = useParentEvents();
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [cursor, setCursor] = useState(today);
  const byDay = useMemo(() => indexEventsByDay(events), [events]);

  const openEvent = (ev: Event) => {
    if (schoolId) navigation.navigate('ParentEventDetail', { schoolId, eventId: ev.id });
  };
  const showDay = (date: Date) => {
    setCursor(date);
    setViewMode('day');
  };

  if (!schoolId) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content} accessibilityState={{ busy: true }}>
        <TabHeader overline="School" title="Calendar" style={styles.header} />
        <View style={styles.skeletons}>
          <Skeleton height={52} borderRadius={radius.chip} />
          <Skeleton height={150} borderRadius={radius.card} />
          <Skeleton height={340} borderRadius={radius.card} />
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingBottom: tabBarClearance }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={brand.onHeader} colors={[brand.headerBackground]} />}
      showsVerticalScrollIndicator={false}
    >
      <TabHeader overline="School" title="Calendar" style={styles.header} />
      <ViewModeToggle value={viewMode} onChange={setViewMode} />
      <UpcomingCard events={events} nowMs={nowMs} onOpen={openEvent} />
      {viewMode === 'month' ? (
        <MonthView
          cursor={cursor}
          byDay={byDay}
          nowMs={nowMs}
          onMonthChange={setCursor}
          onDayPress={(date, evs) => {
            if (evs.length === 1) {
              setCursor(date);
              openEvent(evs[0]);
            } else showDay(date);
          }}
        />
      ) : null}
      {viewMode === 'week' ? (
        <WeekView
          cursor={cursor}
          events={events}
          byDay={byDay}
          nowMs={nowMs}
          onCursorChange={setCursor}
          onDayPress={showDay}
          onOpen={openEvent}
        />
      ) : null}
      {viewMode === 'day' ? (
        <DayView cursor={cursor} events={byDay.get(toLocalYMD(cursor)) ?? []} nowMs={nowMs} onCursorChange={setCursor} onOpen={openEvent} />
      ) : null}
    </ScrollView>
  );
}

const createStyles = ({ brand }: Theme) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: brand.background },
    header: { marginBottom: spacing.gapL },
    content: { paddingHorizontal: spacing.screenX },
    skeletons: { gap: 14 },
  });
