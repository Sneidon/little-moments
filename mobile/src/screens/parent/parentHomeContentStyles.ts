import type { ColorPalette } from '../../theme/colors';

/**
 * Plain style objects merged into StyleSheet.create() on parent home + daily report
 * so stat cards and update cards stay identical.
 */
export function getParentHomeContentStyles(colors: ColorPalette) {
  return {
    dateBar: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      backgroundColor: colors.card,
      marginHorizontal: 16,
      marginTop: 16,
      paddingVertical: 12,
      paddingHorizontal: 8,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    dateArrow: { padding: 4 },
    dateCenter: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8 },
    dateText: { fontSize: 15, fontWeight: '600' as const, color: colors.textSecondary },
    datePickerDone: {
      marginTop: 8,
      marginHorizontal: 16,
      paddingVertical: 10,
      alignItems: 'center' as const,
      backgroundColor: colors.primary,
      borderRadius: 8,
    },
    datePickerDoneText: { color: colors.primaryContrast, fontWeight: '600' as const, fontSize: 16 },

    section: { marginTop: 24, paddingHorizontal: 16 },
    sectionHeader: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      marginBottom: 12,
    },
    /** Title in the overview row (next to Announcements) */
    sectionOverviewTitle: {
      fontSize: 18,
      fontWeight: '700' as const,
      color: colors.textSecondary,
      flexShrink: 1,
    },
    /** Title above a vertical list (e.g. Today's Updates) */
    sectionBlockTitle: {
      fontSize: 18,
      fontWeight: '700' as const,
      color: colors.textSecondary,
      marginBottom: 12,
    },
    sectionBtn: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 8,
      backgroundColor: colors.backgroundSecondary,
      borderWidth: 1,
      borderColor: colors.border,
    },
    sectionBtnText: { fontSize: 13, fontWeight: '600' as const, color: colors.textMuted },

    statsRow: { flexDirection: 'row' as const, gap: 10 },
    statCard: {
      flex: 1,
      backgroundColor: colors.card,
      padding: 14,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      alignItems: 'center' as const,
    },
    statMeals: {},
    statNap: {},
    statNappy: {},
    statActivities: {},
    statValue: { fontSize: 26, fontWeight: '800' as const, color: colors.textSecondary },
    statLabel: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
    statMealsValue: { color: colors.warning },
    statNapValue: { color: '#7c3aed' },
    statNappyValue: { color: '#0d9488' },
    statActivitiesValue: { color: '#2563eb' },

    updateCard: {
      flexDirection: 'row' as const,
      alignItems: 'flex-start' as const,
      backgroundColor: colors.card,
      padding: 14,
      borderRadius: 12,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    updateCardIcon: { marginRight: 12 },
    updateCardContent: { flex: 1 },
    updateTime: { fontSize: 12, color: colors.textMuted },
    updateType: { fontSize: 14, fontWeight: '600' as const, color: colors.text, marginTop: 4 },
    updateNotes: { fontSize: 14, color: colors.textMuted, marginTop: 4 },
    empty: { color: colors.textMuted, textAlign: 'center' as const, marginTop: 8 },
  };
}
