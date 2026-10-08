import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NATIVE_TAB_BAR_CLEARANCE_IOS, NATIVE_TAB_BAR_HEIGHT_ANDROID } from '../theme/tokens';

/** Breathing room between the last item on a tab screen and the tab bar. */
const TAB_BAR_GAP = 32;

/**
 * Bottom padding for a scrollable tab screen so its last item clears the floating tab bar.
 * `automaticInsets` is for screens that keep the native tabs' automatic inset adjustment: iOS already
 * insets those for the tab bar, so they only need the gap. Android never insets tab content.
 */
export function useTabBarClearance({ automaticInsets = false }: { automaticInsets?: boolean } = {}): number {
  const insets = useSafeAreaInsets();
  if (Platform.OS === 'android') return insets.bottom + NATIVE_TAB_BAR_HEIGHT_ANDROID + TAB_BAR_GAP;
  if (automaticInsets) return TAB_BAR_GAP;
  return insets.bottom + NATIVE_TAB_BAR_CLEARANCE_IOS + TAB_BAR_GAP;
}
