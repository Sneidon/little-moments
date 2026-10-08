import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useThemedStyles, type Theme } from '../../../hooks/useThemedStyles';
import { brandFont } from '../../../theme/typography';
import { radius } from '../../../theme/tokens';

export type ViewMode = 'month' | 'week' | 'day';

const MODES: { value: ViewMode; label: string }[] = [
  { value: 'month', label: 'Month' },
  { value: 'week', label: 'Week' },
  { value: 'day', label: 'Day' },
];

export function ViewModeToggle({ value, onChange }: { value: ViewMode; onChange: (mode: ViewMode) => void }) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.row}>
      {MODES.map((m) => (
        <TouchableOpacity
          key={m.value}
          style={[styles.pill, value === m.value && styles.pillActive]}
          onPress={() => onChange(m.value)}
          activeOpacity={0.85}
          accessibilityRole="tab"
          accessibilityState={{ selected: value === m.value }}
        >
          <Text style={[styles.text, value === m.value && styles.textActive]}>{m.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const createStyles = ({ brand }: Theme) =>
  StyleSheet.create({
    row: { flexDirection: 'row', gap: 4, padding: 4, marginBottom: 14, borderRadius: radius.chip + 4, backgroundColor: brand.surface },
    pill: { flex: 1, paddingVertical: 10, borderRadius: radius.chip, alignItems: 'center' },
    pillActive: { backgroundColor: brand.inverseFill },
    text: { fontSize: 14, color: brand.textSecondary, fontFamily: brandFont.body700 },
    textActive: { color: brand.onInverse },
  });
