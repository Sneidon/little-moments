import { Platform } from 'react-native';

export function softShadow(isDark: boolean, ios: object, androidElevation: number) {
  if (isDark) return {};
  return Platform.OS === 'ios' ? ios : Platform.OS === 'android' ? { elevation: androidElevation } : {};
}
