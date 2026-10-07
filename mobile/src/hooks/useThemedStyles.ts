import { useMemo } from 'react';
import { useTheme } from '../context/ThemeContext';

export type Theme = ReturnType<typeof useTheme>;

export function useThemedStyles<T>(factory: (theme: Theme) => T): T {
  const theme = useTheme();
  return useMemo(() => factory(theme), [factory, theme]);
}
