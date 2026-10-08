import React, { useMemo } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../../context/ThemeContext';
import { brandFont } from '../../../../theme/typography';
import { radius, type BrandPalette, type CategoryPalette } from '../../../../theme/tokens';

type Props = {
  value: boolean;
  onChange: (value: boolean) => void;
  rosterLoaded: boolean;
  childCount: number;
  disabled: boolean;
};

function subtitle(rosterLoaded: boolean, count: number, on: boolean): string {
  if (!rosterLoaded) return 'Loading class list...';
  if (count === 0) return 'No children in your class yet. Add students to use this option.';
  const noun = count === 1 ? 'child' : 'children';
  return on
    ? `This update is for all ${count} ${noun}. Every family is notified.`
    : `Post once for every child in your class and notify all parents (${count} ${noun}).`;
}

export function WholeClassToggle({ value, onChange, rosterLoaded, childCount, disabled }: Props) {
  const { brand, category } = useTheme();
  const styles = useMemo(() => createStyles(brand, category), [brand, category]);
  const on = value && childCount > 0;
  return (
    <View style={[styles.card, on && styles.cardOn]}>
      <View style={styles.icon}>
        <Ionicons name="people" size={22} color={category.onCategory} />
      </View>
      <View style={styles.text}>
        <Text style={styles.title}>Whole class</Text>
        <Text style={styles.subtitle}>{subtitle(rosterLoaded, childCount, value)}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        disabled={disabled || !rosterLoaded || childCount === 0}
        trackColor={{ false: brand.disabledBorder, true: brand.primaryButton }}
        accessibilityLabel="Whole class"
        accessibilityHint="When on, this update is shared with every family in your class"
      />
    </View>
  );
}

function createStyles(brand: BrandPalette, category: CategoryPalette) {
  return StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginTop: 16,
      padding: 14,
      borderRadius: radius.chip,
      borderWidth: 2,
      borderColor: brand.surfaceRaised,
      backgroundColor: brand.surfaceRaised,
    },
    cardOn: { borderColor: brand.textPrimary },
    icon: { width: 44, height: 44, borderRadius: 14, backgroundColor: category.attendance, alignItems: 'center', justifyContent: 'center' },
    text: { flex: 1, minWidth: 0 },
    title: { fontSize: 16, fontFamily: brandFont.body800, color: brand.textPrimary },
    subtitle: { fontSize: 13, lineHeight: 19, fontFamily: brandFont.body500, color: brand.textSecondary, marginTop: 4 },
  });
}
