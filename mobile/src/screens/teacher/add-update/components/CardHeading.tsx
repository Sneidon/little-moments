import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../../../context/ThemeContext';
import { brandFont } from '../../../../theme/typography';
import { radius, spacing, type as typeTokens, type BrandPalette } from '../../../../theme/tokens';

type Props = { eyebrow: string; title: string; hint?: string; accessory?: React.ReactNode };

export function CardHeading({ eyebrow, title, hint, accessory }: Props) {
  const styles = useCardStyles();
  return (
    <View style={styles.headRow}>
      <View style={styles.headText}>
        <Text style={styles.eyebrow}>{eyebrow}</Text>
        <Text style={styles.title} accessibilityRole="header">
          {title}
        </Text>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
      {accessory}
    </View>
  );
}

function createCardStyles(brand: BrandPalette) {
  return StyleSheet.create({
    card: { backgroundColor: brand.surface, borderRadius: radius.cardL, padding: spacing.cardPadding, marginBottom: 16 },
    headRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 18 },
    headText: { flex: 1, minWidth: 0, gap: 6 },
    eyebrow: { ...typeTokens.overline, fontSize: 12, letterSpacing: 0.96, color: brand.textSecondary },
    title: { ...typeTokens.section, lineHeight: 25, color: brand.textPrimary },
    hint: { fontFamily: brandFont.body400, fontSize: 14, lineHeight: 20, color: brand.textSecondary },
  });
}

export function useCardStyles() {
  const { brand } = useTheme();
  return useMemo(() => createCardStyles(brand), [brand]);
}
