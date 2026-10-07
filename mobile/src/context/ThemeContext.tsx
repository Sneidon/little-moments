import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SystemUI from 'expo-system-ui';
import { lightColors, darkColors, type ColorPalette } from '../theme/colors';
import {
  brandDark,
  brandLight,
  categoryDark,
  categoryLight,
  type BrandPalette,
  type CategoryPalette,
} from '../theme/tokens';

const THEME_KEY = '@little_moments_theme';

export type ThemeMode = 'light' | 'dark' | 'system';

type ThemeContextValue = {
  colors: ColorPalette;
  /** Teacher redesign palette (tokens.ts). */
  brand: BrandPalette;
  /** Update-type category fills (tokens.ts). */
  category: CategoryPalette;
  isDark: boolean;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemDark = useColorScheme() === 'dark';
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const [, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then((stored) => {
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        setThemeModeState(stored);
      }
      setLoaded(true);
    });
  }, []);

  const setThemeMode = useCallback((mode: ThemeMode) => {
    setThemeModeState(mode);
    AsyncStorage.setItem(THEME_KEY, mode);
  }, []);

  const isDark = themeMode === 'system' ? systemDark : themeMode === 'dark';
  const colors = isDark ? darkColors : lightColors;
  const brand = isDark ? brandDark : brandLight;
  const category = isDark ? categoryDark : categoryLight;

  useEffect(() => {
    const bg = isDark ? '#000000' : '#FFFFFF';
    SystemUI.setBackgroundColorAsync(bg).catch(() => {});
  }, [isDark]);

  const value = useMemo<ThemeContextValue>(
    () => ({ colors, brand, category, isDark, themeMode, setThemeMode }),
    [colors, brand, category, isDark, themeMode, setThemeMode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
