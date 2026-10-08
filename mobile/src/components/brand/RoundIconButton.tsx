import React from 'react';
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { size as sizeTokens } from '../../theme/tokens';

type RoundIconButtonVariant = 'onHeader' | 'onHeaderLight' | 'inverse' | 'raised' | 'ghost';

type Props = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  /** Required: icon-only buttons must be labelled for screen readers. */
  accessibilityLabel: string;
  onPress?: () => void;
  variant?: RoundIconButtonVariant;
  size?: number;
  iconSize?: number;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
};

export function RoundIconButton({
  icon,
  accessibilityLabel,
  onPress,
  variant = 'raised',
  size = sizeTokens.roundButton,
  iconSize = 20,
  disabled,
  style,
  children,
}: Props) {
  const { brand, category } = useTheme();
  const palette: Record<RoundIconButtonVariant, { bg: string; fg: string }> = {
    onHeader: { bg: 'rgba(255,255,255,0.14)', fg: brand.onHeader },
    onHeaderLight: { bg: 'rgba(255,255,255,0.75)', fg: category.onCategory },
    inverse: { bg: brand.inverseFill, fg: brand.onInverse },
    raised: { bg: brand.surfaceRaised, fg: brand.textPrimary },
    ghost: { bg: 'transparent', fg: brand.textTertiary },
  };
  const { bg, fg } = palette[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!disabled }}
      hitSlop={size < sizeTokens.touchMin ? (sizeTokens.touchMin - size) / 2 : undefined}
      style={({ pressed }) => [
        styles.base,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: bg },
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}
    >
      <Ionicons name={icon} size={iconSize} color={fg} />
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: 0.4 },
  pressed: { opacity: 0.75 },
});
