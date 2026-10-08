import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { brandFont } from '../../theme/typography';
import { radius } from '../../theme/tokens';
import { RoundIconButton } from './RoundIconButton';

type Props = {
  label: string;
  onPrev: () => void;
  onNext: () => void;
  onPressLabel: () => void;
  nextDisabled?: boolean;
};

export function DatePill({ label, onPrev, onNext, onPressLabel, nextDisabled }: Props) {
  const { brand } = useTheme();
  return (
    <View style={[styles.pill, { backgroundColor: brand.surface }]} accessibilityLabel="Choose day">
      <RoundIconButton icon="chevron-back" variant="raised" size={44} accessibilityLabel="Previous day" onPress={onPrev} />
      <TouchableOpacity
        style={styles.center}
        onPress={onPressLabel}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`${label}. Choose a date`}
      >
        <Ionicons name="calendar-outline" size={18} color={brand.textPrimary} />
        <Text style={[styles.label, { color: brand.textPrimary }]}>{label}</Text>
      </TouchableOpacity>
      <RoundIconButton
        icon="chevron-forward"
        variant={nextDisabled ? 'ghost' : 'raised'}
        size={44}
        accessibilityLabel="Next day"
        onPress={onNext}
        disabled={nextDisabled}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: radius.pill,
    padding: 4,
  },
  center: { flex: 1, minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  label: { fontFamily: brandFont.body800, fontSize: 16 },
});
