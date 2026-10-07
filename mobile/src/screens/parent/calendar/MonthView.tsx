import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { useTheme } from '../../../context/ThemeContext';
import { useThemedStyles, type Theme } from '../../../hooks/useThemedStyles';
import { font } from '../../../theme/typography';
import type { Event } from '@shared/types';
import { getDayHighlightLevel, getEventHighlight, getMonthGrid, toLocalYMD } from './calendarUtils';
import { CalendarNav } from './CalendarNav';
import { createCalendarStyles, highlightColors } from './calendarStyles';

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

type Props = {
  cursor: Date;
  byDay: Map<string, Event[]>;
  nowMs: number;
  onMonthChange: (date: Date) => void;
  onDayPress: (date: Date, events: Event[]) => void;
};

export function MonthView({ cursor, byDay, nowMs, onMonthChange, onDayPress }: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const shared = useThemedStyles(createCalendarStyles);
  const { width } = useWindowDimensions();
  const cellW = (width - 32) / 7;
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const grid = useMemo(() => getMonthGrid(year, month), [year, month]);
  const todayYmd = toLocalYMD(new Date());
  const selectedYmd = toLocalYMD(cursor);

  return (
    <View style={shared.card}>
      <CalendarNav
        title={cursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
        onPrev={() => onMonthChange(new Date(year, month - 1, 1))}
        onNext={() => onMonthChange(new Date(year, month + 1, 1))}
      />
      <View style={styles.weekdayRow}>
        {WEEKDAY_LABELS.map((d) => (
          <View key={d} style={[styles.weekdayCell, { width: cellW }]}>
            <Text style={styles.weekdayText}>{d}</Text>
          </View>
        ))}
      </View>
      {grid.map((row, ri) => (
        <View key={ri} style={styles.gridRow}>
          {row.map((day, ci) => {
            if (day == null) return <View key={`e-${ci}`} style={[styles.dayCell, { width: cellW }]} />;
            const date = new Date(year, month, day);
            const ymd = toLocalYMD(date);
            const evs = byDay.get(ymd) ?? [];
            const isToday = ymd === todayYmd;
            const isSelected = ymd === selectedYmd;
            const level = getDayHighlightLevel(evs, nowMs);
            const lit = level === 'ongoing' || level === 'upcoming';
            const tone = lit ? highlightColors(colors, level) : null;
            return (
              <TouchableOpacity
                key={ymd}
                style={[
                  styles.dayCell,
                  { width: cellW },
                  tone && [styles.dayCellHighlight, { borderColor: tone.border, backgroundColor: tone.background }],
                  level === 'past_only' && evs.length > 0 && styles.dayCellPastOnly,
                  isToday && !lit && styles.dayCellToday,
                  isSelected && styles.dayCellSelected,
                ]}
                onPress={() => onDayPress(date, evs)}
                activeOpacity={0.75}
              >
                <Text
                  style={[
                    styles.dayNum,
                    (isToday || isSelected) && styles.dayNumStrong,
                    level === 'ongoing' && { color: colors.success, fontFamily: font.bold },
                    level === 'upcoming' && !isSelected && { color: colors.primary, fontFamily: font.semiBold },
                  ]}
                >
                  {day}
                </Text>
                <View style={styles.dotRow}>
                  {evs.slice(0, 3).map((ev) => {
                    const h = getEventHighlight(ev, nowMs);
                    return (
                      <View
                        key={ev.id}
                        style={[styles.dot, h !== 'past' && styles.dotBright, { backgroundColor: highlightColors(colors, h).accent }]}
                      />
                    );
                  })}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const createStyles = ({ colors, isDark }: Theme) =>
  StyleSheet.create({
    weekdayRow: { flexDirection: 'row', marginBottom: 4 },
    weekdayCell: { alignItems: 'center', paddingVertical: 6 },
    weekdayText: { fontSize: 11, color: colors.textMuted, fontFamily: font.semiBold },
    gridRow: { flexDirection: 'row', justifyContent: 'flex-start' },
    dayCell: { minHeight: 52, paddingVertical: 6, alignItems: 'center', borderRadius: 8 },
    dayCellToday: { backgroundColor: colors.primaryMuted },
    dayCellSelected: { borderWidth: 1.5, borderColor: colors.primary },
    dayCellHighlight: { borderWidth: 2 },
    dayCellPastOnly: { backgroundColor: isDark ? 'rgba(148,163,184,0.08)' : 'rgba(15,23,42,0.04)' },
    dayNum: { fontSize: 14, color: colors.text, fontFamily: font.medium },
    dayNumStrong: { fontFamily: font.bold, color: colors.primary },
    dotRow: { flexDirection: 'row', gap: 3, marginTop: 4, minHeight: 6, justifyContent: 'center' },
    dot: { width: 5, height: 5, borderRadius: 2.5 },
    dotBright: { width: 6, height: 6, borderRadius: 3 },
  });
