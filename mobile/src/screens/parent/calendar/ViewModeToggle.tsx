import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useThemedStyles, type Theme } from '../../../hooks/useThemedStyles';
import { font } from '../../../theme/typography';

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
        >
          <Text style={[styles.text, value === m.value && styles.textActive]}>{m.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const createStyles = ({ colors }: Theme) =>
  StyleSheet.create({
    row: { flexDirection: 'row', gap: 8, marginBottom: 16 },
    pill: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 12,
      alignItems: 'center',
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    pillActive: { backgroundColor: colors.primaryMuted, borderColor: colors.primary },
    text: { fontSize: 14, color: colors.textSecondary, fontFamily: font.semiBold },
    textActive: { color: colors.primary },
  });
