import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { brandFont } from '../../theme/typography';
import { size as sizeTokens } from '../../theme/tokens';

/**
 * Tabs whose screens use the redesign background; the area around the floating
 * bar matches them. Other tabs keep their legacy page background.
 */
const BRAND_ROUTES = new Set(['Dashboard', 'Students']);

/**
 * Floating teacher tab bar. Rendered in normal layout flow (not absolute), so
 * tab screens end above it and need no extra bottom padding.
 */
export function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { brand, category, colors, isDark } = useTheme();
  const activeRoute = state.routes[state.index]?.name;
  const surroundBg = BRAND_ROUTES.has(activeRoute) ? brand.background : colors.backgroundSecondary;

  return (
    <View style={{ backgroundColor: surroundBg, paddingBottom: insets.bottom + 20, paddingTop: 8 }}>
      <View
        accessibilityRole="tablist"
        style={[
          styles.bar,
          { backgroundColor: brand.tabBar, shadowColor: brand.shadow, shadowOpacity: isDark ? 0.7 : 0.45 },
        ]}
      >
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const focused = state.index === index;
          const label =
            typeof options.tabBarLabel === 'string' ? options.tabBarLabel : options.title ?? route.name;
          const color = focused ? category.onCategory : brand.tabInactive;
          const badge = options.tabBarBadge;

          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
          };
          const onLongPress = () => navigation.emit({ type: 'tabLongPress', target: route.key });

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              onLongPress={onLongPress}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={
                badge != null ? `${label}, ${badge} unread` : options.tabBarAccessibilityLabel ?? label
              }
              style={[styles.item, focused && { backgroundColor: brand.tabActive }]}
            >
              <View>
                {options.tabBarIcon?.({ focused, color, size: 20 })}
                {badge != null ? (
                  <View style={[styles.badge, { backgroundColor: colors.danger, borderColor: brand.tabBar }]}>
                    <Text style={styles.badgeText} numberOfLines={1}>
                      {badge}
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text
                style={[styles.label, { color, fontFamily: focused ? brandFont.body800 : brandFont.body600 }]}
                numberOfLines={1}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    marginHorizontal: 16,
    borderRadius: 30,
    padding: 8,
    flexDirection: 'row',
    gap: 4,
    shadowOffset: { width: 0, height: 14 },
    shadowRadius: 14,
    elevation: 10,
  },
  item: {
    flex: 1,
    height: sizeTokens.tabItemHeight,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  label: { fontSize: 12 },
  badge: {
    position: 'absolute',
    top: -6,
    right: -12,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: '#FFFFFF', fontSize: 10, fontFamily: brandFont.body800 },
});
