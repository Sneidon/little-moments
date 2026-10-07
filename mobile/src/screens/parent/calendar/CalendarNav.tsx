import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../context/ThemeContext';
import { useThemedStyles } from '../../../hooks/useThemedStyles';
import { createCalendarStyles } from './calendarStyles';

type Props = { title: string; onPrev: () => void; onNext: () => void; compact?: boolean; titleLines?: number };

export function CalendarNav({ title, onPrev, onNext, compact, titleLines = 1 }: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createCalendarStyles);
  return (
    <View style={styles.navRow}>
      <TouchableOpacity onPress={onPrev} hitSlop={12} style={styles.navBtn}>
        <Ionicons name="chevron-back" size={22} color={colors.primary} />
      </TouchableOpacity>
      <Text style={[styles.navTitle, compact && styles.navTitleShrink]} numberOfLines={titleLines}>
        {title}
      </Text>
      <TouchableOpacity onPress={onNext} hitSlop={12} style={styles.navBtn}>
        <Ionicons name="chevron-forward" size={22} color={colors.primary} />
      </TouchableOpacity>
    </View>
  );
}
