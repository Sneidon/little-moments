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
  legacyPaletteFromBrand,
  type BrandPalette,
  type CategoryPalette,
} from '../theme/tokens';

const THEME_KEY = '@little_moments_theme';

export type ThemeMode = 'light' | 'dark' | 'system';

type ThemeContextValue = {
  colors: ColorPalette;
  brand: BrandPalette;
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
  const brand = isDark ? brandDark : brandLight;
  const category = isDark ? categoryDark : categoryLight;
  const colors = useMemo(
    () => legacyPaletteFromBrand(isDark ? darkColors : lightColors, brand, category),
    [isDark, brand, category]
  );

  useEffect(() => {
    const bg = brand.background;
    SystemUI.setBackgroundColorAsync(bg).catch(() => {});
  }, [brand.background]);

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
