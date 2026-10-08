import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../../../context/ThemeContext';
import { useThemedStyles, type Theme } from '../../../hooks/useThemedStyles';
import { brandFont } from '../../../theme/typography';
import { radius, type as typeTokens } from '../../../theme/tokens';
import type { Event } from '@shared/types';
import { addDays, eventsInWeek, getDayHighlightLevel, groupEventsByDayKeys, startOfWeekSunday, toLocalYMD } from './calendarUtils';
import { CalendarNav } from './CalendarNav';
import { createCalendarStyles, highlightColors } from './calendarStyles';
import { EventRow } from './EventRow';

type Props = {
  cursor: Date;
  events: Event[];
  byDay: Map<string, Event[]>;
  nowMs: number;
  onCursorChange: (date: Date) => void;
  onDayPress: (date: Date) => void;
  onOpen: (event: Event) => void;
};

function weekTitle(start: Date) {
  const from = start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const to = addDays(start, 6).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  return `${from} – ${to}`;
}

export function WeekView({ cursor, events, byDay, nowMs, onCursorChange, onDayPress, onOpen }: Props) {
  const { brand, category } = useTheme();
  const styles = useThemedStyles(createStyles);
  const shared = useThemedStyles(createCalendarStyles);
  const weekStart = useMemo(() => startOfWeekSunday(cursor), [cursor]);
  const weekEvents = useMemo(() => eventsInWeek(events, weekStart), [events, weekStart]);
  const grouped = useMemo(() => groupEventsByDayKeys(weekEvents, weekStart), [weekEvents, weekStart]);
  const todayYmd = toLocalYMD(new Date());
  const selectedYmd = toLocalYMD(cursor);

  return (
    <View style={shared.card}>
      <CalendarNav title={weekTitle(weekStart)} compact onPrev={() => onCursorChange(addDays(cursor, -7))} onNext={() => onCursorChange(addDays(cursor, 7))} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
        {Array.from({ length: 7 }, (_, i) => {
          const d = addDays(weekStart, i);
          const ymd = toLocalYMD(d);
          const evs = byDay.get(ymd) ?? [];
          const level = getDayHighlightLevel(evs, nowMs);
          const lit = level === 'ongoing' || level === 'upcoming';
          const tone = lit ? highlightColors({ brand, category }, level) : null;
          const isSelected = ymd === selectedYmd;
          const dotColor = tone?.text ?? (evs.length > 0 ? brand.textTertiary : 'transparent');
          return (
            <TouchableOpacity
              key={ymd}
              style={[
                styles.chip,
                tone && { backgroundColor: tone.background },
                isSelected && styles.chipSelected,
              ]}
              onPress={() => onDayPress(d)}
              accessibilityRole="button"
            >
              <Text style={[styles.dayName, ymd === todayYmd && styles.todayText, tone && { color: tone.text }]}>
                {d.toLocaleDateString(undefined, { weekday: 'short' })}
              </Text>
              <Text style={[styles.dayNum, tone && { color: tone.text }]}>{d.getDate()}</Text>
              {evs.length > 0 ? (
                <View style={styles.dotWrap}>
                  <View style={[styles.dot, { backgroundColor: dotColor }]} />
                </View>
              ) : null}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      <Text style={styles.sectionLabel}>This week</Text>
      {grouped.map(({ ymd, label, events: evs }) =>
        evs.length ? (
          <View key={ymd} style={styles.section}>
            <Text style={styles.sectionTitle}>{label}</Text>
            {evs.map((ev) => (
              <EventRow key={ev.id} event={ev} nowMs={nowMs} onPress={() => onOpen(ev)} />
            ))}
          </View>
        ) : null
      )}
      {weekEvents.length === 0 ? <Text style={shared.mutedCenter}>No events this week.</Text> : null}
    </View>
  );
}

const createStyles = ({ brand }: Theme) =>
  StyleSheet.create({
    strip: { flexDirection: 'row', gap: 8, paddingVertical: 4, marginBottom: 8 },
    chip: { width: 52, alignItems: 'center', paddingVertical: 10, borderRadius: radius.chip, backgroundColor: brand.surfaceRaised },
    chipSelected: { borderWidth: 2, borderColor: brand.textPrimary },
    dayName: { fontSize: 12, color: brand.textTertiary, fontFamily: brandFont.body800 },
    todayText: { color: brand.textPrimary },
    dayNum: { fontSize: 19, color: brand.textPrimary, marginTop: 4, fontFamily: brandFont.display800 },
    dotWrap: { minHeight: 10, justifyContent: 'center', alignItems: 'center', marginTop: 4 },
    dot: { width: 6, height: 6, borderRadius: 3 },
    sectionLabel: { ...typeTokens.overline, color: brand.textTertiary, marginTop: 8, marginBottom: 10 },
    section: { marginBottom: 12 },
    sectionTitle: { fontSize: 14, color: brand.textSecondary, fontFamily: brandFont.body800, marginBottom: 8 },
  });
