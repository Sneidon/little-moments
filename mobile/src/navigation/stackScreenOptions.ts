import { useMemo } from 'react';
import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { useTheme } from '../context/ThemeContext';
import { brandFont } from '../theme/typography';

export function useStackScreenOptions(): NativeStackNavigationOptions {
  const { brand } = useTheme();
  return useMemo(
    () => ({
      headerShown: true,
      headerBackButtonDisplayMode: 'minimal',
      headerStyle: { backgroundColor: brand.background },
      headerTintColor: brand.textPrimary,
      headerTitleStyle: { fontFamily: brandFont.display800, fontSize: 18, color: brand.textPrimary },
      headerShadowVisible: false,
      contentStyle: { backgroundColor: brand.background },
    }),
    [brand]
  );
}
