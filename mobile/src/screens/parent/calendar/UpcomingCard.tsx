import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../context/ThemeContext';
import { useThemedStyles, type Theme } from '../../../hooks/useThemedStyles';
import { brandFont } from '../../../theme/typography';
import { radius, type as typeTokens } from '../../../theme/tokens';
import type { Event } from '@shared/types';
import { formatEventTimeRange, getEventHighlight, getUpcomingAndOngoingEvents } from './calendarUtils';
import { createCalendarStyles, highlightColors } from './calendarStyles';

const PREVIEW_LIMIT = 6;

type Props = { events: Event[]; nowMs: number; onOpen: (event: Event) => void };

export function UpcomingCard({ events, nowMs, onOpen }: Props) {
  const { brand, category } = useTheme();
  const styles = useThemedStyles(createStyles);
  const shared = useThemedStyles(createCalendarStyles);
  const preview = useMemo(() => getUpcomingAndOngoingEvents(events, nowMs, PREVIEW_LIMIT), [events, nowMs]);
  const total = useMemo(() => events.filter((ev) => getEventHighlight(ev, nowMs) !== 'past').length, [events, nowMs]);

  return (
    <View style={[shared.card, styles.card]}>
      <View style={styles.header}>
        <View style={[styles.headerIcon, { backgroundColor: category.nap }]}>
          <Ionicons name="calendar-outline" size={20} color={category.onCategory} />
        </View>
        <Text style={styles.headerTitle}>Upcoming</Text>
        {total > 0 ? <Text style={styles.count}>{total}</Text> : null}
      </View>
      {preview.length === 0 ? <Text style={styles.empty}>No upcoming events scheduled.</Text> : null}
      <View style={styles.list}>
        {preview.map((ev) => {
          const ongoing = getEventHighlight(ev, nowMs) === 'ongoing';
          return (
            <TouchableOpacity key={ev.id} style={styles.row} onPress={() => onOpen(ev)} activeOpacity={0.75} accessibilityRole="button">
              <View style={[styles.dot, { backgroundColor: highlightColors({ brand, category }, ongoing ? 'ongoing' : 'upcoming').accent }]} />
              <View style={styles.rowBody}>
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {ev.title}
                </Text>
                <Text style={styles.rowMeta} numberOfLines={1}>
                  {ongoing ? 'Now · ' : ''}
                  {formatEventTimeRange(ev)}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={brand.textTertiary} />
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

const createStyles = ({ brand }: Theme) =>
  StyleSheet.create({
    card: { gap: 12 },
    header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    headerIcon: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { flex: 1, ...typeTokens.cardTitle, color: brand.textPrimary },
    count: {
      fontSize: 13,
      color: brand.onInverse,
      backgroundColor: brand.inverseFill,
      overflow: 'hidden',
      paddingHorizontal: 10,
      paddingVertical: 3,
      borderRadius: radius.chip,
      fontFamily: brandFont.body800,
    },
    empty: { fontSize: 14, color: brand.textTertiary, fontFamily: brandFont.body600 },
    list: { gap: 8 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14, borderRadius: radius.chip, backgroundColor: brand.surfaceRaised },
    dot: { width: 10, height: 10, borderRadius: 5 },
    rowBody: { flex: 1, minWidth: 0, gap: 2 },
    rowTitle: { fontSize: 15, color: brand.textPrimary, fontFamily: brandFont.body800 },
    rowMeta: { fontSize: 13, color: brand.textTertiary, fontFamily: brandFont.body700 },
    moreHint: { fontSize: 13, color: brand.textTertiary, fontFamily: brandFont.body600 },
  });
