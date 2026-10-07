import { useMemo } from 'react';
import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { useTheme } from '../context/ThemeContext';
import { brandFont } from '../theme/typography';

/**
 * Shared native-stack header styling for the redesign: icon-only back button
 * (no "Back" / previous-title text), display-font title, and the redesign
 * page background so headers blend into the screen.
 */
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
