import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../context/ThemeContext';
import { useThemedStyles, type Theme } from '../../../hooks/useThemedStyles';
import { font } from '../../../theme/typography';
import type { Event } from '@shared/types';
import { formatEventTimeRange, getEventHighlight, type EventHighlight } from './calendarUtils';
import { softShadow } from '../../../theme/shadow';
import { highlightColors } from './calendarStyles';

function EventBadge({ highlight }: { highlight: EventHighlight }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  if (highlight === 'past') return null;
  const ongoing = highlight === 'ongoing';
  const color = ongoing ? colors.accentTeal : colors.primary;
  return (
    <View style={[styles.badge, { backgroundColor: ongoing ? colors.accentTealSoft : colors.primaryMuted }]}>
      <Ionicons name={ongoing ? 'radio-button-on' : 'time-outline'} size={12} color={color} style={{ marginRight: 4 }} />
      <Text style={[styles.badgeText, { color }]}>{ongoing ? 'Happening now' : 'Upcoming'}</Text>
    </View>
  );
}

type Props = { event: Event; nowMs: number; onPress: () => void; large?: boolean };

export function EventRow({ event, nowMs, onPress, large }: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const h = getEventHighlight(event, nowMs);
  const tone = highlightColors(colors, h);
  const past = h === 'past';
  return (
    <TouchableOpacity
      style={[styles.row, large && styles.rowLarge, { borderColor: tone.border, backgroundColor: tone.background }, !past && styles.elevated]}
      onPress={onPress}
      activeOpacity={0.75}
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
      <Ionicons name="chevron-forward" size={large ? 20 : 18} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

const createStyles = ({ colors, isDark }: Theme) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderRadius: 12,
      paddingVertical: 12,
      paddingRight: 10,
      marginBottom: 8,
    },
    rowLarge: { alignItems: 'flex-start' },
    elevated: softShadow(isDark, { shadowColor: '#0f172a', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4 }, 1),
    bar: { width: 4, alignSelf: 'stretch', borderTopLeftRadius: 12, borderBottomLeftRadius: 12 },
    body: { flex: 1, paddingLeft: 12, paddingRight: 8 },
    titleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
    title: { fontSize: 15, color: colors.text, fontFamily: font.semiBold, flex: 1, minWidth: 0 },
    titlePast: { color: colors.textSecondary, opacity: 0.85 },
    meta: { fontSize: 13, color: colors.textMuted, marginTop: 4, fontFamily: font.regular },
    desc: { fontSize: 14, color: colors.textSecondary, marginTop: 6, fontFamily: font.regular },
    descPast: { opacity: 0.75 },
    badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
    badgeText: { fontSize: 11, fontFamily: font.semiBold },
  });
