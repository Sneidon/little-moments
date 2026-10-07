import React, { useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { SkeletonCard } from '../../components/Skeleton';
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
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { colors } = useTheme();
  const { schoolId, events, nowMs, refreshing, onRefresh } = useParentEvents();
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [cursor, setCursor] = useState(today);
  const byDay = useMemo(() => indexEventsByDay(events), [events]);
  const background = { backgroundColor: colors.backgroundSecondary };

  const openEvent = (ev: Event) => {
    if (schoolId) navigation.navigate('ParentEventDetail', { schoolId, eventId: ev.id });
  };
  const showDay = (date: Date) => {
    setCursor(date);
    setViewMode('day');
  };

  if (!schoolId) {
    return (
      <ScrollView style={[styles.screen, background]} contentContainerStyle={styles.loader}>
        {[1, 2, 3].map((i) => (
          <SkeletonCard key={i} />
        ))}
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={[styles.screen, background]}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      showsVerticalScrollIndicator={false}
    >
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

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 12 },
  loader: { flex: 1, padding: 16 },
});
