import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../context/ThemeContext';

export type DateBarProps = {
  selectedDate: string;
  displayDate: string;
  onPrevDay: () => void;
  onNextDay: () => void;
  onOpenPicker: () => void;
  showPicker: boolean;
  onPickerChange: (event: { type: string }, date?: Date) => void;
  onClosePicker?: () => void;
  maxDate?: Date;
};

export function DateBar({
  selectedDate,
  displayDate,
  onPrevDay,
  onNextDay,
  onOpenPicker,
  showPicker,
  onPickerChange,
  onClosePicker,
  maxDate = new Date(),
}: DateBarProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <>
      <View style={styles.dateBar}>
        <TouchableOpacity onPress={onPrevDay} style={styles.arrow}>
          <Ionicons name="chevron-back" size={24} color={colors.textMuted} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.center} onPress={onOpenPicker} activeOpacity={0.7}>
          <Ionicons name="calendar-outline" size={20} color={colors.textMuted} />
          <Text style={styles.dateText}>{displayDate}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onNextDay} style={styles.arrow}>
          <Ionicons name="chevron-forward" size={24} color={colors.textMuted} />
        </TouchableOpacity>
      </View>
      {showPicker && (
        <>
          <DateTimePicker
            value={new Date(selectedDate + 'T12:00:00')}
            mode="date"
            display={Platform.OS === 'ios' ? 'calendar' : 'default'}
            onChange={onPickerChange}
            maximumDate={maxDate}
          />
          {Platform.OS === 'ios' && onClosePicker && (
            <TouchableOpacity style={styles.doneBtn} onPress={onClosePicker}>
              <Text style={styles.doneText}>Done</Text>
            </TouchableOpacity>
          )}
        </>
      )}
    </>
  );
}

function createStyles(colors: import('../theme/colors').ColorPalette) {
  return StyleSheet.create({
    dateBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.card,
      marginHorizontal: 16,
      marginTop: 16,
      paddingVertical: 12,
      paddingHorizontal: 8,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    arrow: { padding: 4 },
    center: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    dateText: { fontSize: 15, fontWeight: '600', color: colors.textSecondary },
    doneBtn: {
      marginTop: 8,
      paddingVertical: 10,
      alignItems: 'center',
      backgroundColor: colors.primary,
      borderRadius: 8,
      marginHorizontal: 16,
    },
    doneText: { color: colors.primaryContrast, fontWeight: '600', fontSize: 16 },
  });
}
