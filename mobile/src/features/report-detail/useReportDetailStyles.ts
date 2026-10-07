import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { font } from '../../theme/typography';
import type { ColorPalette } from '../../theme/colors';

export function useReportDetailStyles() {
  const { colors } = useTheme();
  return useMemo(() => createStyles(colors), [colors]);
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.backgroundSecondary },
    scrollContent: { padding: 16, paddingBottom: 40 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: colors.backgroundSecondary },
    loadingText: { marginTop: 12, fontFamily: font.regular, fontSize: 15, color: colors.textMuted },
    errorTitle: { fontFamily: font.semiBold, fontSize: 18, marginTop: 16, color: colors.text },
    errorSub: { fontFamily: font.regular, fontSize: 14, marginTop: 8, textAlign: 'center', color: colors.textSecondary },
    hero: {
      alignItems: 'center',
      paddingVertical: 28,
      paddingHorizontal: 20,
      borderRadius: 16,
      borderWidth: 1,
      marginBottom: 16,
      backgroundColor: colors.card,
      borderColor: colors.cardBorder,
    },
    heroIcon: { width: 72, height: 72, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
    heroTitle: { fontFamily: font.bold, fontSize: 22, textAlign: 'center', color: colors.text },
    heroType: { fontFamily: font.regular, fontSize: 14, marginTop: 6, color: colors.textMuted },
    card: { borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 16, backgroundColor: colors.card, borderColor: colors.cardBorder },
    cardTitle: {
      fontFamily: font.semiBold,
      fontSize: 13,
      letterSpacing: 0.4,
      textTransform: 'uppercase',
      marginBottom: 12,
      color: colors.textSecondary,
    },
    row: { paddingVertical: 12 },
    rowDivider: { borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth },
    rowLabel: { fontFamily: font.medium, fontSize: 13, marginBottom: 4, color: colors.textMuted },
    rowValue: { fontFamily: font.regular, fontSize: 16, lineHeight: 22, color: colors.text },
    emptyDetail: { fontFamily: font.regular, fontSize: 15, paddingVertical: 8, color: colors.textMuted },
    photoWrap: { width: '100%', borderRadius: 12, overflow: 'hidden', backgroundColor: colors.backgroundSecondary },
    photo: { width: '100%' },
    photoSizing: { minHeight: 200, maxHeight: 360 },
    videoBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      paddingVertical: 20,
      borderRadius: 12,
      backgroundColor: colors.primaryMuted,
    },
    videoBtnText: { fontFamily: font.semiBold, fontSize: 16, color: colors.primary },
  });
}
