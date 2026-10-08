import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { brandFont } from '../../theme/typography';
import { radius, type as typeTokens, type BrandPalette } from '../../theme/tokens';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

function useSettingsStyles() {
  const { brand } = useTheme();
  return useMemo(() => createStyles(brand), [brand]);
}

export function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  const styles = useSettingsStyles();
  return (
    <>
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      <View style={styles.card}>{children}</View>
    </>
  );
}

type RowProps = {
  icon: IconName;
  tile: string;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  chevron?: boolean;
};

export function SettingsRow({ icon, tile, title, subtitle, onPress, chevron }: RowProps) {
  const styles = useSettingsStyles();
  const { brand, category } = useTheme();
  const content = (
    <>
      <View style={[styles.tile, { backgroundColor: tile }]}>
        <Ionicons name={icon} size={20} color={category.onCategory} />
      </View>
      <View style={styles.text}>
        <Text style={styles.rowTitle} numberOfLines={2}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {chevron ? <Ionicons name="chevron-forward" size={20} color={brand.textTertiary} /> : null}
    </>
  );
  if (!onPress) return <View style={styles.row}>{content}</View>;
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.75} accessibilityRole="button" accessibilityLabel={title}>
      {content}
    </TouchableOpacity>
  );
}

export function SettingsDivider() {
  const styles = useSettingsStyles();
  return <View style={styles.divider} />;
}

export function SettingsNote({ children }: { children: string }) {
  const styles = useSettingsStyles();
  return <Text style={styles.note}>{children}</Text>;
}

function createStyles(brand: BrandPalette) {
  return StyleSheet.create({
    title: { ...typeTokens.section, color: brand.textPrimary, marginTop: 24, marginBottom: 12, marginHorizontal: 4 },
    card: { backgroundColor: brand.surface, borderRadius: radius.card, paddingVertical: 6 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 64, paddingVertical: 10, paddingHorizontal: 16 },
    tile: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    text: { flex: 1, minWidth: 0, gap: 2 },
    rowTitle: { fontFamily: brandFont.body800, fontSize: 16, color: brand.textPrimary },
    subtitle: { fontFamily: brandFont.body500, fontSize: 14, color: brand.textSecondary },
    divider: { height: StyleSheet.hairlineWidth, backgroundColor: brand.disabledBorder, marginLeft: 74 },
    note: { ...typeTokens.body, color: brand.textSecondary, paddingHorizontal: 16, paddingVertical: 14 },
  });
}
