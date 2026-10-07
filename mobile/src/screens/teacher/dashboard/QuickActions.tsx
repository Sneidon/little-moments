import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../context/ThemeContext';
import { brandFont } from '../../../theme/typography';
import { spacing, updateTypeStyle, type BrandPalette } from '../../../theme/tokens';

export type QuickAction = { label: string; typeKey: string; initialType?: string };

export const QUICK_ACTIONS: QuickAction[] = [
  { label: 'Check in', typeKey: 'check_in', initialType: 'check_in' },
  { label: 'Log Meal', typeKey: 'meal', initialType: 'meal' },
  { label: 'Log Nap', typeKey: 'nap_time', initialType: 'nap_time' },
  { label: 'Log Nappy', typeKey: 'nappy_change', initialType: 'nappy_change' },
  { label: 'Log Medication', typeKey: 'medication', initialType: 'medication' },
  { label: 'Add Activity', typeKey: 'activity', initialType: 'activity' },
  { label: 'Add Photo', typeKey: 'incident', initialType: 'incident' },
  { label: 'Planned', typeKey: 'planned' },
];

export function QuickActions({ onPress }: { onPress: (action: QuickAction) => void }) {
  const { brand, category } = useTheme();
  const { width } = useWindowDimensions();
  const tileWidth = Math.floor((width - spacing.screenX * 2 - 20) / 3);
  const styles = useMemo(() => createStyles(brand), [brand]);
  return (
    <View style={styles.grid}>
      {QUICK_ACTIONS.map((action) => {
        const style = updateTypeStyle(action.typeKey);
        return (
          <TouchableOpacity
            key={action.label}
            style={[styles.tile, { width: tileWidth }]}
            onPress={() => onPress(action)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={action.label}
          >
            <View style={[styles.icon, { backgroundColor: category[style.category] }]}>
              <Ionicons name={style.icon} size={22} color={category.onCategory} />
            </View>
            <Text style={styles.label} numberOfLines={2}>
              {action.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function createStyles(brand: BrandPalette) {
  return StyleSheet.create({
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    tile: { gap: 18, padding: 14, borderRadius: 24, backgroundColor: brand.surface },
    icon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    label: { fontFamily: brandFont.body800, fontSize: 15, color: brand.textPrimary },
  });
}
