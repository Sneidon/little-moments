import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useThemedStyles, type Theme } from '../../hooks/useThemedStyles';
import { brandFont } from '../../theme/typography';
import { radius } from '../../theme/tokens';
import { SavingIndicator } from './SavingIndicator';

export function SavingCard({ label }: { label: string }) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.card} accessible accessibilityRole="progressbar" accessibilityLabel={label} accessibilityLiveRegion="polite">
      <SavingIndicator />
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const createStyles = ({ brand }: Theme) =>
  StyleSheet.create({
    card: {
      minWidth: 180,
      alignItems: 'center',
      gap: 14,
      paddingVertical: 26,
      paddingHorizontal: 32,
      borderRadius: radius.cardL,
      backgroundColor: brand.surface,
      shadowColor: brand.shadow,
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.25,
      shadowRadius: 24,
      elevation: 12,
    },
    label: { fontFamily: brandFont.body700, fontSize: 16, color: brand.textPrimary },
  });
