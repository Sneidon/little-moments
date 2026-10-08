import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../context/ThemeContext';
import { useThemedStyles, type Theme } from '../../../hooks/useThemedStyles';
import type { ColorPalette } from '../../../theme/colors';
import { font } from '../../../theme/typography';
import type { Event } from '@shared/types';
import type { EventHighlight } from '../calendar/calendarUtils';
import { ClassAudienceNote, PostSummaryCard } from '../../../features/school-post';
import type { ScheduleContext } from './eventDetail';

function statusStyle(colors: ColorPalette, h: EventHighlight) {
  if (h === 'past') return { label: 'Past event', icon: 'archive-outline', bg: colors.backgroundSecondary, fg: colors.textMuted } as const;
  if (h === 'ongoing') return { label: 'Happening now', icon: 'radio-button-on', bg: colors.accentTealSoft, fg: colors.success } as const;
  return { label: 'Upcoming', icon: 'arrow-forward-circle-outline', bg: colors.primaryMuted, fg: colors.primary } as const;
}

export function EventSummaryCard({ event, ctx }: { event: Event; ctx: ScheduleContext }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const status = statusStyle(colors, ctx.highlight);
  const ongoing = ctx.highlight === 'ongoing';
  const relative = ongoing ? { bg: colors.accentTealSoft, fg: colors.success } : { bg: colors.primaryMuted, fg: colors.primary };

  return (
    <PostSummaryCard>
      <View style={[styles.statusPill, { backgroundColor: status.bg }]}>
        <Ionicons name={status.icon} size={15} color={status.fg} style={styles.statusIcon} />
        <Text style={[styles.statusText, { color: status.fg }]}>{status.label}</Text>
      </View>
      <Text style={styles.title} accessibilityRole="header">
        {event.title}
      </Text>
      {ctx.relative ? (
        <View style={[styles.relativeBanner, { backgroundColor: relative.bg }]}>
          <Ionicons name={ongoing ? 'time-outline' : 'hourglass-outline'} size={16} color={relative.fg} style={{ marginRight: 8 }} />
          <Text style={[styles.relativeText, { color: relative.fg }]}>{ctx.relative}</Text>
        </View>
      ) : null}

      <View style={styles.scheduleRow}>
        <View style={styles.scheduleIcon}>
          <Ionicons name="calendar" size={22} color={colors.primary} />
        </View>
        <View style={styles.scheduleBody}>
          <Text style={styles.weekday}>{ctx.weekday}</Text>
          <Text style={styles.date}>{ctx.dateLine}</Text>
          <View style={styles.timeRow}>
            <Ionicons name="time-outline" size={16} color={colors.textMuted} style={{ marginRight: 6 }} />
            <Text style={styles.time}>{ctx.timeLine}</Text>
            {ctx.durationLabel ? (
              <View style={styles.durationChip}>
                <Text style={styles.durationText}>{ctx.durationLabel}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>

      {event.targetType === 'classes' ? <ClassAudienceNote /> : null}
    </PostSummaryCard>
  );
}

const createStyles = ({ colors }: Theme) =>
  StyleSheet.create({
    statusPill: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 999,
      marginBottom: 12,
    },
    statusIcon: { marginRight: 6 },
    statusText: { fontSize: 13, fontFamily: font.semiBold },
    title: { fontSize: 24, fontFamily: font.bold, lineHeight: 30, letterSpacing: -0.3, color: colors.text },
    relativeBanner: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, marginBottom: 14 },
    relativeText: { fontSize: 14, fontFamily: font.semiBold, flex: 1 },
    scheduleRow: { flexDirection: 'row', paddingTop: 14, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.cardBorder },
    scheduleIcon: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 14,
      backgroundColor: colors.primaryMuted,
    },
    scheduleBody: { flex: 1, minWidth: 0 },
    weekday: { fontSize: 17, fontFamily: font.bold, color: colors.text },
    date: { fontSize: 15, marginTop: 2, fontFamily: font.regular, color: colors.textSecondary },
    timeRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginTop: 10 },
    time: { fontSize: 16, fontFamily: font.semiBold, color: colors.primary },
    durationChip: { marginLeft: 8, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: colors.backgroundSecondary },
    durationText: { fontSize: 12, fontFamily: font.semiBold, color: colors.textSecondary },
  });
