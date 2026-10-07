import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../../../context/ThemeContext';
import { useThemedStyles, type Theme } from '../../../hooks/useThemedStyles';
import { font } from '../../../theme/typography';
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
  const { colors } = useTheme();
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
          const tone = lit ? highlightColors(colors, level) : null;
          const isSelected = ymd === selectedYmd;
          const dotColor = tone?.accent ?? (evs.length > 0 ? colors.textMuted : 'transparent');
          return (
            <TouchableOpacity
              key={ymd}
              style={[
                styles.chip,
                tone && { borderColor: tone.border, borderWidth: 2, backgroundColor: tone.background },
                isSelected && styles.chipSelected,
              ]}
              onPress={() => onDayPress(d)}
            >
              <Text style={[styles.dayName, ymd === todayYmd && { color: colors.primary }, tone && { color: tone.accent }]}>
                {d.toLocaleDateString(undefined, { weekday: 'short' })}
              </Text>
              <Text style={[styles.dayNum, isSelected && { color: colors.primary }, tone && { color: tone.accent }]}>{d.getDate()}</Text>
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

const createStyles = ({ colors }: Theme) =>
  StyleSheet.create({
    strip: { flexDirection: 'row', gap: 8, paddingVertical: 8, marginBottom: 8 },
    chip: {
      width: 52,
      alignItems: 'center',
      paddingVertical: 10,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      backgroundColor: colors.backgroundSecondary,
    },
    chipSelected: { backgroundColor: colors.primaryMuted, borderColor: colors.primary },
    dayName: { fontSize: 11, color: colors.textMuted, fontFamily: font.semiBold },
    dayNum: { fontSize: 18, color: colors.text, marginTop: 4, fontFamily: font.bold },
    dotWrap: { minHeight: 10, justifyContent: 'center', alignItems: 'center', marginTop: 4 },
    dot: { width: 6, height: 6, borderRadius: 3 },
    sectionLabel: {
      fontSize: 12,
      letterSpacing: 0.5,
      color: colors.textMuted,
      fontFamily: font.semiBold,
      marginTop: 8,
      marginBottom: 8,
      textTransform: 'uppercase',
    },
    section: { marginBottom: 12 },
    sectionTitle: { fontSize: 14, color: colors.textSecondary, fontFamily: font.semiBold, marginBottom: 8 },
  });
