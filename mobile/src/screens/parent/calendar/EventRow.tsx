import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../context/ThemeContext';
import { useThemedStyles, type Theme } from '../../../hooks/useThemedStyles';
import { brandFont } from '../../../theme/typography';
import { radius } from '../../../theme/tokens';
import type { Event } from '@shared/types';
import { formatEventTimeRange, getEventHighlight, type EventHighlight } from './calendarUtils';
import { highlightColors } from './calendarStyles';

function EventBadge({ highlight }: { highlight: EventHighlight }) {
  const { brand, category } = useTheme();
  const styles = useThemedStyles(createStyles);
  if (highlight === 'past') return null;
  const tone = highlightColors({ brand, category }, highlight);
  return (
    <View style={[styles.badge, { backgroundColor: tone.background }]}>
      <Text style={[styles.badgeText, { color: tone.text }]}>{highlight === 'ongoing' ? 'Happening now' : 'Upcoming'}</Text>
    </View>
  );
}

type Props = { event: Event; nowMs: number; onPress: () => void; large?: boolean };

export function EventRow({ event, nowMs, onPress, large }: Props) {
  const { brand, category } = useTheme();
  const styles = useThemedStyles(createStyles);
  const h = getEventHighlight(event, nowMs);
  const tone = highlightColors({ brand, category }, h);
  const past = h === 'past';
  return (
    <TouchableOpacity
      style={[styles.row, large && styles.rowLarge]}
      onPress={onPress}
      activeOpacity={0.75}
      accessibilityRole="button"
    >
      <View style={[styles.bar, { backgroundColor: tone.accent }]} />
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, past && styles.titlePast]} numberOfLines={large ? undefined : 2}>
            {event.title}
          </Text>
          <EventBadge highlight={h} />
        </View>
        <Text style={styles.meta}>{formatEventTimeRange(event)}</Text>
        {large && event.description ? (
          <Text style={[styles.desc, past && styles.descPast]} numberOfLines={3}>
            {event.description}
          </Text>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={brand.textTertiary} />
    </TouchableOpacity>
  );
}

const createStyles = ({ brand }: Theme) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: radius.chip,
      paddingVertical: 12,
      paddingRight: 12,
      marginBottom: 8,
      backgroundColor: brand.surfaceRaised,
      overflow: 'hidden',
    },
    rowLarge: { alignItems: 'flex-start' },
    bar: { width: 6, alignSelf: 'stretch', borderRadius: 3, marginLeft: 8 },
    body: { flex: 1, paddingLeft: 12, paddingRight: 8, gap: 4 },
    titleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
    title: { fontSize: 15, color: brand.textPrimary, fontFamily: brandFont.body800, flex: 1, minWidth: 0 },
    titlePast: { color: brand.textSecondary },
    meta: { fontSize: 13, color: brand.textTertiary, fontFamily: brandFont.body700 },
    desc: { fontSize: 14, lineHeight: 20, color: brand.textSecondary, fontFamily: brandFont.body500 },
    descPast: { opacity: 0.8 },
    badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.chip },
    badgeText: { fontSize: 12, fontFamily: brandFont.body800 },
  });
