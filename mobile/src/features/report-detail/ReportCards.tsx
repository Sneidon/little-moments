import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles, type Theme } from '../../hooks/useThemedStyles';
import { brandFont } from '../../theme/typography';
import { radius, type as typeTokens, updateTypeStyle } from '../../theme/tokens';
import { reportTypeLabel, type DetailRow } from './reportFields';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

export function ReportHero({ type, title, time, date }: { type: string; title: string; time?: string; date?: string }) {
  const { category } = useTheme();
  const styles = useThemedStyles(createStyles);
  const typeStyle = updateTypeStyle(type);
  return (
    <View style={[styles.hero, { backgroundColor: category[typeStyle.category] }]}>
      <View style={styles.ring} pointerEvents="none" />
      <View style={styles.heroTop}>
        <View style={styles.heroIcon}>
          <Ionicons name={typeStyle.icon} size={26} color={category.onCategory} />
        </View>
        {time ? (
          <View style={styles.timeChip}>
            <Ionicons name="time-outline" size={16} color={category.onCategory} />
            <Text style={styles.timeText}>{time}</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.heroText}>
        <Text style={styles.heroOverline}>{reportTypeLabel(type)}</Text>
        <Text style={styles.heroTitle} accessibilityRole="header">
          {title}
        </Text>
        {date ? <Text style={styles.heroDate}>{date}</Text> : null}
      </View>
    </View>
  );
}

const PEOPLE_ICONS: Record<string, IconName> = { Child: 'happy-outline', 'Logged by': 'person-outline' };

export function DetailCard({ rows, people = false }: { rows: DetailRow[]; people?: boolean }) {
  const styles = useThemedStyles(createStyles);
  const { brand } = useTheme();
  return (
    <View style={styles.card}>
      {rows.map((row, i) => (
        <View key={`${row.label}-${i}`} style={[styles.row, i > 0 && styles.rowDivider]}>
          {people ? (
            <View style={styles.rowIcon}>
              <Ionicons name={PEOPLE_ICONS[row.label] ?? 'ellipse-outline'} size={20} color={brand.textSecondary} />
            </View>
          ) : null}
          <View style={styles.rowText}>
            <Text style={styles.rowLabel}>{row.label}</Text>
            <Text style={styles.rowValue}>{row.value}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

export function NotesCard({ notes }: { notes: string }) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.card}>
      <Text style={styles.notes}>{notes}</Text>
    </View>
  );
}

export function SectionTitle({ children }: { children: string }) {
  const styles = useThemedStyles(createStyles);
  return (
    <Text style={styles.section} accessibilityRole="header">
      {children}
    </Text>
  );
}

const createStyles = ({ brand, category }: Theme) =>
  StyleSheet.create({
    hero: { borderRadius: radius.cardL, padding: 22, gap: 22, overflow: 'hidden' },
    ring: {
      position: 'absolute',
      width: 160,
      height: 160,
      borderRadius: 80,
      borderWidth: 22,
      borderColor: 'rgba(255,255,255,0.3)',
      right: -50,
      bottom: -60,
    },
    heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    heroIcon: {
      width: 52,
      height: 52,
      borderRadius: 18,
      backgroundColor: 'rgba(255,255,255,0.5)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    timeChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: 'rgba(255,255,255,0.5)',
      borderRadius: radius.chip,
      paddingVertical: 8,
      paddingHorizontal: 12,
    },
    timeText: { fontFamily: brandFont.body800, fontSize: 15, color: category.onCategory },
    heroText: { gap: 4 },
    heroOverline: { ...typeTokens.overline, color: category.onCategoryMuted },
    heroTitle: { fontFamily: brandFont.display800, fontSize: 30, lineHeight: 34, letterSpacing: -0.6, color: category.onCategory },
    heroDate: { fontFamily: brandFont.body700, fontSize: 15, color: category.onCategoryMuted },
    section: { ...typeTokens.section, color: brand.textPrimary, marginTop: 10, marginHorizontal: 4 },
    card: { backgroundColor: brand.surface, borderRadius: radius.card, paddingHorizontal: 18, paddingVertical: 6 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14 },
    rowDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: brand.disabledBorder },
    rowIcon: { width: 40, height: 40, borderRadius: 14, backgroundColor: brand.surfaceRaised, alignItems: 'center', justifyContent: 'center' },
    rowText: { flex: 1, minWidth: 0, gap: 2 },
    rowLabel: { fontFamily: brandFont.body700, fontSize: 13, color: brand.textTertiary },
    rowValue: { fontFamily: brandFont.body700, fontSize: 16, lineHeight: 22, color: brand.textPrimary },
    notes: { fontFamily: brandFont.body500, fontSize: 16, lineHeight: 24, color: brand.textPrimary, paddingVertical: 12 },
  });
