import React, { useContext, useEffect, useState } from 'react';
import { StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { NavigationContext } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { radius, spacing, type as typeTokens } from '../../theme/tokens';

/**
 * Like useIsFocused, but also works outside a navigator (e.g. role select and
 * access denied render directly under NavigationContainer); there it is always true.
 */
function useIsFocusedSafe(): boolean {
  const navigation = useContext(NavigationContext);
  const [focused, setFocused] = useState(() => navigation?.isFocused() ?? true);
  useEffect(() => {
    if (!navigation) return undefined;
    setFocused(navigation.isFocused());
    const unsubFocus = navigation.addListener('focus', () => setFocused(true));
    const unsubBlur = navigation.addListener('blur', () => setFocused(false));
    return () => {
      unsubFocus();
      unsubBlur();
    };
  }, [navigation]);
  return focused;
}

type Props = {
  /** 'accent' = headerBackground + white text; 'category' = given fill + dark ink. */
  variant?: 'accent' | 'category';
  /** Fill for the category variant. */
  color?: string;
  /** Show decorative circles (optional decoration per handoff). */
  decorated?: boolean;
  paddingBottom?: number;
  gap?: number;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
};

/** Full-width coloured header block with 40pt bottom corners. */
export function HeaderBlock({
  variant = 'accent',
  color,
  decorated = true,
  paddingBottom = 30,
  gap = 22,
  style,
  children,
}: Props) {
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocusedSafe();
  const { brand, category } = useTheme();
  const isAccent = variant === 'accent';
  const bg = isAccent ? brand.headerBackground : color ?? category.nap;
  return (
    <View
      style={[
        styles.header,
        { backgroundColor: bg, paddingTop: insets.top + 24, paddingBottom, gap },
        style,
      ]}
    >
      {/* Tab screens stay mounted; only the focused one may set the status bar. */}
      {isFocused ? <StatusBar style={isAccent ? 'light' : 'dark'} /> : null}
      {decorated ? (
        isAccent ? (
          <>
            <View
              pointerEvents="none"
              style={[styles.circleLarge, { backgroundColor: category.activity, opacity: 0.16 }]}
            />
            <View
              pointerEvents="none"
              style={[styles.circleSmall, { top: insets.top + 120, backgroundColor: category.photo, opacity: 0.22 }]}
            />
          </>
        ) : (
          <View pointerEvents="none" style={styles.circleWhite} />
        )
      ) : null}
      {children}
    </View>
  );
}

export function Overline({
  children,
  color,
  style,
}: {
  children: React.ReactNode;
  color?: string;
  style?: StyleProp<TextStyle>;
}) {
  const { brand } = useTheme();
  return <Text style={[typeTokens.overline, { color: color ?? brand.onHeaderMuted }, style]}>{children}</Text>;
}

export function DisplayTitle({
  children,
  color,
  style,
}: {
  children: React.ReactNode;
  color?: string;
  style?: StyleProp<TextStyle>;
}) {
  const { brand } = useTheme();
  return (
    <Text accessibilityRole="header" style={[typeTokens.displayXL, { color: color ?? brand.onHeader }, style]}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  header: {
    position: 'relative',
    overflow: 'hidden',
    borderBottomLeftRadius: radius.header,
    borderBottomRightRadius: radius.header,
    paddingHorizontal: spacing.screenX,
  },
  circleLarge: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    right: -70,
    top: -60,
  },
  circleSmall: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    right: 60,
  },
  circleWhite: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    right: -80,
    top: -40,
    backgroundColor: '#FFFFFF',
    opacity: 0.25,
  },
});
