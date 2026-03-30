import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ThemeMode } from '../context/ThemeContext';

type Ion = React.ComponentProps<typeof Ionicons>['name'];

export function themeSubtitle(mode: ThemeMode): string {
  if (mode === 'system') return 'System preference';
  if (mode === 'light') return 'Always light';
  return 'Always dark';
}

export function themePickerLabel(mode: ThemeMode): string {
  if (mode === 'system') return 'System';
  if (mode === 'light') return 'Light';
  return 'Dark';
}

export function SettingsIconBox({
  name,
  backgroundColor,
  iconColor,
  size = 22,
}: {
  name: Ion;
  backgroundColor: string;
  iconColor: string;
  size?: number;
}) {
  return (
    <View style={[iconBoxStyles.wrap, { backgroundColor }]}>
      <Ionicons name={name} size={size} color={iconColor} />
    </View>
  );
}

const iconBoxStyles = StyleSheet.create({
  wrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export function settingsCardShadow(isDark: boolean): object {
  if (isDark) return {};
  return Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 6,
    },
    android: { elevation: 2 },
    default: {},
  });
}
