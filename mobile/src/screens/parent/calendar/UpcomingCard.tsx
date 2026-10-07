import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../context/ThemeContext';
import { useThemedStyles, type Theme } from '../../../hooks/useThemedStyles';
import { font } from '../../../theme/typography';
import type { Event } from '@shared/types';
import { formatEventTimeRange, getEventHighlight, getUpcomingAndOngoingEvents } from './calendarUtils';
import { createCalendarStyles } from './calendarStyles';

const PREVIEW_LIMIT = 6;

type Props = { events: Event[]; nowMs: number; onOpen: (event: Event) => void };

export function UpcomingCard({ events, nowMs, onOpen }: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const shared = useThemedStyles(createCalendarStyles);
  const preview = useMemo(() => getUpcomingAndOngoingEvents(events, nowMs, PREVIEW_LIMIT), [events, nowMs]);
  const total = useMemo(() => events.filter((ev) => getEventHighlight(ev, nowMs) !== 'past').length, [events, nowMs]);

  return (
    <View style={[shared.card, styles.card]}>
      <View style={styles.header}>
        <Ionicons name="calendar-outline" size={18} color={colors.primary} />
        <Text style={styles.headerTitle}>Upcoming</Text>
        {total > 0 ? <Text style={styles.count}>{total}</Text> : null}
      </View>
      {preview.length === 0 ? <Text style={styles.empty}>No upcoming events scheduled.</Text> : null}
      <View style={styles.list}>
        {preview.map((ev) => {
          const ongoing = getEventHighlight(ev, nowMs) === 'ongoing';
          return (
            <TouchableOpacity key={ev.id} style={styles.row} onPress={() => onOpen(ev)} activeOpacity={0.75}>
              <View style={[styles.dot, { backgroundColor: ongoing ? colors.success : colors.primary }]} />
              <View style={styles.rowBody}>
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {ev.title}
                </Text>
                <Text style={styles.rowMeta} numberOfLines={1}>
                  {ongoing ? 'Now · ' : ''}
                  {formatEventTimeRange(ev)}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          );
        })}
      </View>
      {total > preview.length ? (
        <Text style={styles.moreHint}>
          Showing {preview.length} of {total} — browse the calendar for the rest.
        </Text>
      ) : null}
    </View>
  );
}

const createStyles = ({ colors }: Theme) =>
  StyleSheet.create({
    card: { paddingVertical: 12, marginBottom: 12 },
    header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
    headerTitle: { flex: 1, fontSize: 15, color: colors.text, fontFamily: font.bold },
    count: {
      fontSize: 12,
      color: colors.primary,
      backgroundColor: colors.primaryMuted,
      overflow: 'hidden',
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 999,
      fontFamily: font.semiBold,
    },
    empty: { fontSize: 14, color: colors.textMuted, fontFamily: font.regular },
    list: { gap: 6 },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
      paddingHorizontal: 10,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      backgroundColor: colors.backgroundSecondary,
    },
    dot: { width: 8, height: 8, borderRadius: 4, marginRight: 10 },
    rowBody: { flex: 1, minWidth: 0 },
    rowTitle: { fontSize: 14, color: colors.text, fontFamily: font.semiBold },
    rowMeta: { fontSize: 12, color: colors.textMuted, marginTop: 2, fontFamily: font.regular },
    moreHint: { fontSize: 12, color: colors.textMuted, marginTop: 10, fontFamily: font.regular },
  });
