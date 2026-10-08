import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { brandFont } from '../../theme/typography';
import { radius, type as typeTokens } from '../../theme/tokens';

type Props = {
  label: string;
  value: string | number;
  suffix?: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
  size?: 'L' | 'M';
  style?: StyleProp<ViewStyle>;
};

export function StatTile({ label, value, suffix, icon, color, size = 'M', style }: Props) {
  const { category } = useTheme();
  const ink = category.onCategory;
  const a11y = `${label}: ${value}${suffix ?? ''}`;

  if (size === 'L') {
    return (
      <View accessible accessibilityLabel={a11y} style={[styles.tile, styles.tileL, { backgroundColor: color }, style]}>
        <View style={[styles.iconChip, styles.iconChipL]}>
          <Ionicons name={icon} size={22} color={ink} />
        </View>
        <View style={{ gap: 4 }}>
          <Text style={[typeTokens.statL, { color: ink }]} numberOfLines={1} adjustsFontSizeToFit>
            {value}
            {suffix ? <Text style={[styles.suffixL, { color: category.onCategoryMuted }]}>{suffix}</Text> : null}
          </Text>
          <Text style={[typeTokens.label, { color: ink }]}>{label}</Text>
        </View>
      </View>
    );
  }

  return (
    <View accessible accessibilityLabel={a11y} style={[styles.tile, styles.tileM, { backgroundColor: color }, style]}>
      <View style={styles.rowM}>
        <Text style={[typeTokens.label, { color: ink }]}>{label}</Text>
        <View style={styles.iconChip}>
          <Ionicons name={icon} size={20} color={ink} />
        </View>
      </View>
      <Text style={[typeTokens.statM, { color: ink }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
        {suffix ? <Text style={[styles.suffixM, { color: category.onCategoryMuted }]}>{suffix}</Text> : null}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { flex: 1 },
  tileL: { borderRadius: radius.cardL, padding: 20, gap: 22 },
  tileM: { borderRadius: radius.card, padding: 18, gap: 16 },
  rowM: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  iconChip: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconChipL: { width: 46, height: 46, borderRadius: 23 },
  suffixL: { fontFamily: brandFont.display800, fontSize: 30, letterSpacing: -0.6 },
  suffixM: { fontFamily: brandFont.display800, fontSize: 26, letterSpacing: -0.5 },
});
