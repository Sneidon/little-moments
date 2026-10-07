import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, type ThemeMode } from '../../context/ThemeContext';
import { brandFont } from '../../theme/typography';
import { radius, type BrandPalette } from '../../theme/tokens';
import { SettingsRow, SettingsSection } from './SettingsSection';

const OPTIONS: { mode: ThemeMode; label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
  { mode: 'light', label: 'Light', icon: 'sunny-outline' },
  { mode: 'dark', label: 'Dark', icon: 'moon-outline' },
  { mode: 'system', label: 'System', icon: 'phone-portrait-outline' },
];

const SUBTITLES: Record<ThemeMode, string> = {
  system: 'System preference',
  light: 'Always light',
  dark: 'Always dark',
};

export function ThemeSelector() {
  const { brand, category, themeMode, setThemeMode } = useTheme();
  const styles = useMemo(() => createStyles(brand), [brand]);
  return (
    <SettingsSection title="Appearance">
      <SettingsRow icon="contrast-outline" tile={category.nap} title="Theme" subtitle={SUBTITLES[themeMode]} />
      <View style={styles.row} accessibilityRole="radiogroup">
        {OPTIONS.map((opt) => {
          const active = themeMode === opt.mode;
          return (
            <TouchableOpacity
              key={opt.mode}
              style={[styles.option, active && styles.optionActive]}
              onPress={() => setThemeMode(opt.mode)}
              accessibilityRole="radio"
              accessibilityState={{ checked: active }}
              accessibilityLabel={`${opt.label} theme`}
            >
              <Ionicons name={opt.icon} size={18} color={active ? brand.onInverse : brand.textSecondary} />
              <Text style={[styles.label, active && styles.labelActive]}>{opt.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </SettingsSection>
  );
}

function createStyles(brand: BrandPalette) {
  return StyleSheet.create({
    row: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 16, paddingTop: 4 },
    option: {
      flex: 1,
      minHeight: 48,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      borderRadius: radius.chip,
      backgroundColor: brand.surfaceRaised,
    },
    optionActive: { backgroundColor: brand.inverseFill },
    label: { fontFamily: brandFont.body700, fontSize: 14, color: brand.textSecondary },
    labelActive: { fontFamily: brandFont.body800, color: brand.onInverse },
  });
}
