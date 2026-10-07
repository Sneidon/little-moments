import { Platform, StyleSheet } from 'react-native';
import type { Theme } from '../../../hooks/useThemedStyles';
import type { ColorPalette } from '../../../theme/colors';
import { font } from '../../../theme/typography';
import type { EventHighlight } from './calendarUtils';

export function highlightColors(colors: ColorPalette, h: EventHighlight) {
  if (h === 'upcoming') return { accent: colors.primary, background: colors.primaryMuted, border: colors.primary };
  if (h === 'ongoing') return { accent: colors.success, background: colors.accentTealSoft, border: colors.success };
  return { accent: colors.textMuted, background: colors.backgroundSecondary, border: colors.cardBorder };
}

export function softShadow(isDark: boolean, ios: object, androidElevation: number) {
  if (isDark) return {};
  return Platform.OS === 'ios' ? ios : Platform.OS === 'android' ? { elevation: androidElevation } : {};
}

export const createCalendarStyles = ({ colors, isDark }: Theme) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      padding: 14,
      marginBottom: 16,
      ...softShadow(isDark, { shadowColor: '#0f172a', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 }, 2),
    },
    navRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
    navBtn: { padding: 4 },
    navTitle: { flex: 1, textAlign: 'center', fontSize: 17, color: colors.text, fontFamily: font.bold },
    navTitleShrink: { fontSize: 15 },
    mutedCenter: { textAlign: 'center', color: colors.textMuted, marginTop: 8, fontFamily: font.medium },
  });
