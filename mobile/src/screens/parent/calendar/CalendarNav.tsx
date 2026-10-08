import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../context/ThemeContext';
import { useThemedStyles } from '../../../hooks/useThemedStyles';
import { createCalendarStyles } from './calendarStyles';

type Props = { title: string; onPrev: () => void; onNext: () => void; compact?: boolean; titleLines?: number };

export function CalendarNav({ title, onPrev, onNext, compact, titleLines = 1 }: Props) {
  const { brand } = useTheme();
  const styles = useThemedStyles(createCalendarStyles);
  return (
    <View style={styles.navRow}>
      <TouchableOpacity onPress={onPrev} hitSlop={8} style={styles.navBtn} accessibilityRole="button" accessibilityLabel="Previous">
        <Ionicons name="chevron-back" size={20} color={brand.textPrimary} />
      </TouchableOpacity>
      <Text style={[styles.navTitle, compact && styles.navTitleShrink]} numberOfLines={titleLines}>
        {title}
      </Text>
      <TouchableOpacity onPress={onNext} hitSlop={8} style={styles.navBtn} accessibilityRole="button" accessibilityLabel="Next">
        <Ionicons name="chevron-forward" size={20} color={brand.textPrimary} />
      </TouchableOpacity>
    </View>
  );
}
