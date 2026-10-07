import React from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { reportTypeMeta, type DetailRow } from './reportFields';
import { useReportDetailStyles } from './useReportDetailStyles';

export function ReportHero({ type, title }: { type: string; title: string }) {
  const { colors } = useTheme();
  const styles = useReportDetailStyles();
  const meta = reportTypeMeta(type);
  const accent = meta.color ?? colors.primary;
  return (
    <View style={styles.hero}>
      <View style={[styles.heroIcon, { backgroundColor: accent + '22' }]}>
        <Ionicons name={meta.icon} size={32} color={accent} />
      </View>
      <Text style={styles.heroTitle}>{title}</Text>
      <Text style={styles.heroType}>{meta.label}</Text>
    </View>
  );
}

export function ReportDetailsCard({ rows, hasMedia }: { rows: DetailRow[]; hasMedia: boolean }) {
  const styles = useReportDetailStyles();
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Details</Text>
      {rows.map((row, i) => (
        <View key={`${row.label}-${i}`} style={[styles.row, i > 0 && styles.rowDivider]}>
          <Text style={styles.rowLabel}>{row.label}</Text>
          <Text style={styles.rowValue}>{row.value}</Text>
        </View>
      ))}
      {rows.length === 0 && !hasMedia ? <Text style={styles.emptyDetail}>No extra details.</Text> : null}
    </View>
  );
}
