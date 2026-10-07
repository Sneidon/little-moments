import React, { useMemo } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../../../context/ThemeContext';
import type { useDateNavigation } from '../../../hooks/useDateNavigation';
import { useThemedStyles, type Theme } from '../../../hooks/useThemedStyles';
import { font } from '../../../theme/typography';
import type { DailyReport } from '@shared/types';

type Props = { reports: DailyReport[]; dateNav: ReturnType<typeof useDateNavigation> };

const CORE_TYPES = ['meal', 'nap_time', 'nappy_change'];

function useOverviewStats(reports: DailyReport[]) {
  const { colors } = useTheme();
  return useMemo(() => {
    const count = (type: string) => reports.filter((r) => r.type === type).length;
    return [
      { key: 'meals', label: 'MEALS', value: count('meal'), icon: 'restaurant', color: colors.accentOrange, soft: colors.accentOrangeSoft },
      { key: 'naps', label: 'NAPS', value: count('nap_time'), icon: 'moon', color: colors.accentPurple, soft: colors.accentPurpleSoft },
      { key: 'nappy', label: 'NAPPY', value: count('nappy_change'), icon: 'water', color: colors.accentTeal, soft: colors.accentTealSoft },
      {
        key: 'activities',
        label: 'OTHER UPDATES',
        value: reports.filter((r) => !CORE_TYPES.includes(r.type)).length,
        icon: 'sparkles',
        color: colors.accentPurple,
        soft: colors.accentPurpleSoft,
      },
    ] as const;
  }, [reports, colors]);
}

export function HomeOverview({ reports, dateNav }: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const stats = useOverviewStats(reports);
  const { selectedDate, showDatePicker, setShowDatePicker, prevDay, nextDay, onDatePickerChange, maxDate } = dateNav;
  const dateLabel = new Date(selectedDate + 'T12:00:00').toLocaleDateString(undefined, { month: 'long', day: 'numeric' });

  return (
    <View style={styles.section}>
      <View style={styles.titleRow}>
        <Text style={styles.heading}>{"Today's Overview"}</Text>
        <View style={styles.dateNav}>
          <TouchableOpacity onPress={prevDay} hitSlop={{ top: 8, bottom: 8, left: 8, right: 4 }}>
            <Ionicons name="chevron-back" size={20} color={colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.datePill} onPress={() => setShowDatePicker(true)} activeOpacity={0.7}>
            <Text style={styles.datePillText}>{dateLabel}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={nextDay} hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      </View>
      {showDatePicker ? (
        <>
          <DateTimePicker
            value={new Date(selectedDate + 'T12:00:00')}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onDatePickerChange}
            maximumDate={maxDate}
          />
          {Platform.OS === 'ios' ? (
            <TouchableOpacity style={styles.dateDone} onPress={() => setShowDatePicker(false)}>
              <Text style={styles.dateDoneText}>Done</Text>
            </TouchableOpacity>
          ) : null}
        </>
      ) : null}
      <View style={styles.grid}>
        {stats.map((s) => (
          <View key={s.key} style={[styles.statCard, { borderTopColor: s.color }]}>
            <View style={[styles.statIcon, { backgroundColor: s.soft }]}>
              <Ionicons name={s.icon} size={22} color={s.color} />
            </View>
            <Text style={styles.statLabel}>{s.label}</Text>
            <Text style={styles.statValue}>{s.value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const createStyles = ({ colors }: Theme) =>
  StyleSheet.create({
    section: { marginTop: 12, paddingHorizontal: 20 },
    titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 10 },
    heading: { fontSize: 17, color: colors.text, fontFamily: font.bold },
    dateNav: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    datePill: {
      backgroundColor: colors.card,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    datePillText: { fontSize: 13, color: colors.textSecondary, fontFamily: font.semiBold },
    dateDone: { marginTop: 8, paddingVertical: 12, alignItems: 'center', backgroundColor: colors.primary, borderRadius: 14 },
    dateDoneText: { color: colors.primaryContrast, fontFamily: font.semiBold, fontSize: 16 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    statCard: {
      width: '47%',
      flexGrow: 1,
      minWidth: '45%',
      backgroundColor: colors.card,
      borderRadius: 18,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderTopWidth: 3,
      shadowColor: '#0f172a',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 6,
      elevation: 3,
    },
    statIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
    statLabel: { fontSize: 10, color: colors.textMuted, letterSpacing: 0.6, fontFamily: font.semiBold },
    statValue: { fontSize: 28, color: colors.text, marginTop: 6, fontFamily: font.bold },
  });
