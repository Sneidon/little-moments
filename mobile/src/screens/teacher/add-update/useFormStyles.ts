import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { useTheme } from '../../../context/ThemeContext';
import { brandFont } from '../../../theme/typography';
import { radius, spacing, type as typeTokens, type BrandPalette } from '../../../theme/tokens';

function createFormStyles(brand: BrandPalette) {
  return StyleSheet.create({
    card: { backgroundColor: brand.surface, borderRadius: radius.cardL, padding: spacing.cardPadding, marginBottom: 16 },
    cardHead: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: brand.disabledBorder,
      paddingBottom: 12,
      marginBottom: 4,
    },
    cardTitle: { ...typeTokens.cardTitle, color: brand.textPrimary },
    label: { fontFamily: brandFont.body800, fontSize: 14, color: brand.textPrimary, marginBottom: 8, marginTop: 16 },
    hint: { fontFamily: brandFont.body400, fontSize: 13, lineHeight: 18, color: brand.textTertiary, marginTop: -4, marginBottom: 8 },
    helper: { fontFamily: brandFont.body500, fontSize: 13, lineHeight: 18, color: brand.textTertiary, marginBottom: 8 },
    input: {
      borderWidth: 1.5,
      borderColor: brand.surfaceRaised,
      borderRadius: radius.chip,
      padding: 14,
      fontSize: 15,
      fontFamily: brandFont.body500,
      backgroundColor: brand.surfaceRaised,
      color: brand.textPrimary,
    },
    inputMultiline: { minHeight: 88, textAlignVertical: 'top' },
    inputReadOnly: { color: brand.textSecondary, fontFamily: brandFont.body700 },
    select: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 50,
      paddingVertical: 14,
      paddingHorizontal: 14,
      borderRadius: radius.chip,
      backgroundColor: brand.surfaceRaised,
    },
    selectText: { flex: 1, fontSize: 15, fontFamily: brandFont.body500, color: brand.textPrimary },
    selectPlaceholder: { color: brand.textTertiary },
    options: {
      marginTop: 4,
      borderRadius: radius.chip,
      backgroundColor: brand.surface,
      borderWidth: 1,
      borderColor: brand.disabledBorder,
      overflow: 'hidden',
    },
    option: { paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: brand.disabledBorder },
    optionText: { fontSize: 15, fontFamily: brandFont.body500, color: brand.textSecondary },
    pickerDone: {
      alignSelf: 'flex-end',
      marginTop: 8,
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: radius.buttonS,
      backgroundColor: brand.primaryButton,
    },
    pickerDoneText: { color: brand.onPrimaryButton, fontSize: 15, fontFamily: brandFont.body700 },
  });
}

export function useFormStyles() {
  const { brand } = useTheme();
  return useMemo(() => createFormStyles(brand), [brand]);
}
