import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../context/ThemeContext';
import { useThemedStyles, type Theme } from '../../../hooks/useThemedStyles';
import type { ColorPalette } from '../../../theme/colors';
import { font } from '../../../theme/typography';
import { formatTime } from '../../../utils';
import { resolveReportImageUrl } from '../../../utils/childDailyReportDisplay';
import type { DailyReport } from '@shared/types';

type IoniconName = keyof typeof Ionicons.glyphMap;
type Accent = 'orange' | 'purple' | 'teal';

const TYPE_DISPLAY: Record<string, { label: string; icon: IoniconName; accent: Accent }> = {
  meal: { label: 'Meal', icon: 'restaurant', accent: 'orange' },
  nap_time: { label: 'Nap', icon: 'moon', accent: 'purple' },
  nappy_change: { label: 'Nappy change', icon: 'water', accent: 'teal' },
  check_in: { label: 'Check in', icon: 'log-in', accent: 'orange' },
  check_out: { label: 'Check out', icon: 'log-out', accent: 'orange' },
  activity: { label: 'Activity', icon: 'color-palette', accent: 'orange' },
  class_change: { label: 'Class update', icon: 'school', accent: 'purple' },
  medication: { label: 'Medication', icon: 'medical', accent: 'orange' },
  incident: { label: 'Media', icon: 'camera', accent: 'teal' },
};

function typeDisplay(type: string) {
  return TYPE_DISPLAY[type] ?? { label: type.replace(/_/g, ' '), icon: 'color-palette' as IoniconName, accent: 'orange' as Accent };
}

function accentColors(colors: ColorPalette, accent: Accent) {
  if (accent === 'purple') return { soft: colors.accentPurpleSoft, icon: colors.accentPurple };
  if (accent === 'teal') return { soft: colors.accentTealSoft, icon: colors.accentTeal };
  return { soft: colors.accentOrangeSoft, icon: colors.accentOrange };
}

type Props = {
  title: string;
  reports: DailyReport[];
  mealImages: Map<string, string>;
  onOpen?: (reportId: string) => void;
};

export function HomeUpdates({ title, reports, mealImages, onOpen }: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.section}>
      <Text style={styles.title}>{title}</Text>
      {reports.length === 0 ? <Text style={styles.empty}>No updates for this day.</Text> : null}
      {reports.map((item) => {
        const display = typeDisplay(item.type);
        const accent = accentColors(colors, display.accent);
        const image = resolveReportImageUrl(item, mealImages);
        return (
          <TouchableOpacity
            key={item.id}
            style={styles.card}
            onPress={() => onOpen?.(item.id)}
            activeOpacity={0.7}
            disabled={!onOpen}
            accessibilityRole="button"
          >
            <View style={[styles.icon, { backgroundColor: accent.soft }]}>
              <Ionicons name={display.icon} size={20} color={accent.icon} />
            </View>
            <View style={styles.content}>
              <Ionicons style={styles.chevron} name="chevron-forward" size={18} color={colors.textMuted} />
              <Text style={styles.type}>{display.label}</Text>
              {item.notes ? (
                <Text style={styles.notes} numberOfLines={2}>
                  {item.notes}
                </Text>
              ) : null}
              <Text style={styles.time}>{formatTime(item.timestamp)}</Text>
            </View>
            {image ? <Image source={{ uri: image }} style={styles.image} resizeMode="cover" /> : null}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const createStyles = ({ colors }: Theme) =>
  StyleSheet.create({
    section: { marginTop: 20, paddingHorizontal: 20 },
    title: { fontSize: 17, color: colors.text, marginBottom: 14, fontFamily: font.bold },
    empty: { color: colors.textMuted, textAlign: 'center', marginTop: 8, fontFamily: font.medium },
    card: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: colors.card,
      padding: 14,
      borderRadius: 16,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    icon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    content: { flex: 1, minWidth: 0, position: 'relative', paddingRight: 22 },
    chevron: { position: 'absolute', top: 0, right: 0 },
    image: {
      width: 56,
      height: 56,
      borderRadius: 10,
      marginLeft: 8,
      backgroundColor: colors.backgroundSecondary,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    type: { fontSize: 15, color: colors.text, marginTop: 4, fontFamily: font.semiBold },
    notes: { fontSize: 14, color: colors.textSecondary, marginTop: 6, lineHeight: 20, fontFamily: font.regular },
    time: { fontSize: 12, color: colors.textMuted, marginTop: 6, fontFamily: font.medium },
  });
