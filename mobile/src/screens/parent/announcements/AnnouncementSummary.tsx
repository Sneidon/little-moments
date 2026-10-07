import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../context/ThemeContext';
import { ClassAudienceNote, PostSummaryCard } from '../../../features/school-post';
import { useThemedStyles, type Theme } from '../../../hooks/useThemedStyles';
import { font } from '../../../theme/typography';
import type { Announcement } from '@shared/types';

function formatPostedAt(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return {
    date: d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }),
    time: d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }),
  };
}

export function AnnouncementSummary({ announcement }: { announcement: Announcement }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const posted = formatPostedAt(announcement.createdAt);

  return (
    <PostSummaryCard>
      <View style={styles.pill}>
        <Ionicons name="megaphone-outline" size={14} color={colors.primary} style={{ marginRight: 6 }} />
        <Text style={styles.pillText}>School announcement</Text>
      </View>
      <Text style={styles.title} accessibilityRole="header">
        {announcement.title}
      </Text>
      {posted ? (
        <View style={styles.metaRow}>
          <View style={styles.metaIcon}>
            <Ionicons name="calendar-outline" size={18} color={colors.textMuted} />
          </View>
          <View style={styles.metaBody}>
            <Text style={styles.metaDate}>{posted.date}</Text>
            <View style={styles.timeRow}>
              <Ionicons name="time-outline" size={15} color={colors.textMuted} style={{ marginRight: 6 }} />
              <Text style={styles.metaTime}>{posted.time}</Text>
            </View>
          </View>
        </View>
      ) : null}
      {announcement.targetType === 'classes' ? <ClassAudienceNote /> : null}
    </PostSummaryCard>
  );
}

const createStyles = ({ colors }: Theme) =>
  StyleSheet.create({
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      marginBottom: 12,
      backgroundColor: colors.primaryMuted,
    },
    pillText: { fontSize: 12, fontFamily: font.semiBold, color: colors.primary },
    title: { fontSize: 22, fontFamily: font.bold, lineHeight: 28, letterSpacing: -0.3, color: colors.text },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginTop: 14,
      paddingTop: 14,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.cardBorder,
    },
    metaIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
      backgroundColor: colors.backgroundSecondary,
    },
    metaBody: { flex: 1, minWidth: 0 },
    metaDate: { fontSize: 16, fontFamily: font.semiBold, color: colors.text },
    timeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
    metaTime: { fontSize: 14, fontFamily: font.regular, color: colors.textSecondary },
  });
