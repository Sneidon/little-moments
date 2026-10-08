import React from 'react';
import { Platform } from 'react-native';
import type { NativeBottomTabNavigationOptions } from '@react-navigation/bottom-tabs/unstable';
import { useTheme } from '../context/ThemeContext';
import { NotificationBellButton } from '../components/NotificationBellButton';
import { brandFont } from '../theme/typography';

/**
 * Shared native tab bar + header options. On iOS 26+ the tab bar is Liquid Glass
 * (its background follows the content and can't be overridden); Android uses the
 * Material bar with the sunflower active indicator from the redesign.
 */
export function useTabScreenOptions() {
  const { colors, brand, category } = useTheme();
  return ({ navigation }: { navigation: { getParent: () => unknown } }): NativeBottomTabNavigationOptions => ({
    headerShown: false,
    headerStyle: { backgroundColor: brand.background },
    headerTintColor: brand.textPrimary,
    headerTitleStyle: { fontFamily: brandFont.display800, fontSize: 18, color: brand.textPrimary },
    headerShadowVisible: false,
    headerRight: () => (
      <NotificationBellButton
        colors={colors}
        onPress={() =>
          (navigation.getParent() as { navigate: (name: string) => void } | undefined)?.navigate(
            'UserNotifications'
          )
        }
      />
    ),
    tabBarActiveTintColor: Platform.OS === 'ios' ? brand.primaryButton : category.onCategory,
    tabBarInactiveTintColor: brand.textSecondary,
    tabBarActiveIndicatorColor: category.activity,
    tabBarStyle: { backgroundColor: brand.surface },
    tabBarLabelStyle: { fontFamily: brandFont.body700, fontSize: 12 },
    // Material hides inactive labels by default once there are more than three tabs.
    tabBarLabelVisibilityMode: 'labeled',
    tabBarBadgeStyle: { backgroundColor: colors.danger, color: '#FFFFFF' },
  });
}
