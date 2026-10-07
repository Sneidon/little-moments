import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { brandFont } from '../../theme/typography';
import { radius } from '../../theme/tokens';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

type ButtonProps = {
  label: string;
  onPress?: () => void;
  icon?: IoniconName;
  disabled?: boolean;
  loading?: boolean;
  /** 'm' = 58 tall / radius 22, 's' = 54 tall / radius 20. */
  size?: 'm' | 's';
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

/** Primary button: purple in light mode, sunflower in dark mode. */
export function PrimaryButton({ label, onPress, icon, disabled, loading, size = 'm', style, accessibilityLabel }: ButtonProps) {
  const { brand } = useTheme();
  const dims = size === 'm' ? styles.sizeM : styles.sizeS;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!(disabled || loading), busy: !!loading }}
      style={({ pressed }) => [
        styles.base,
        dims,
        { backgroundColor: brand.primaryButton },
        (disabled || loading) && styles.disabled,
        pressed && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={brand.onPrimaryButton} />
      ) : icon ? (
        <Ionicons name={icon} size={20} color={brand.primaryButtonIcon} />
      ) : null}
      <Text style={[styles.label, size === 's' && styles.labelS, { color: brand.onPrimaryButton }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

/** Outline button: transparent with a 2.5pt textPrimary border. */
export function OutlineButton({ label, onPress, icon, disabled, loading, size = 'm', style, accessibilityLabel }: ButtonProps) {
  const { brand } = useTheme();
  const dims = size === 'm' ? styles.sizeM : styles.sizeS;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!(disabled || loading), busy: !!loading }}
      style={({ pressed }) => [
        styles.base,
        dims,
        styles.outline,
        { borderColor: brand.textPrimary },
        (disabled || loading) && styles.disabled,
        pressed && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={brand.textPrimary} />
      ) : icon ? (
        <Ionicons name={icon} size={19} color={brand.textPrimary} />
      ) : null}
      <Text style={[styles.label, size === 's' && styles.labelS, { color: brand.textPrimary }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 14,
  },
  sizeM: { height: 58, borderRadius: radius.button },
  sizeS: { height: 54, borderRadius: radius.buttonS },
  outline: { borderWidth: 2.5, backgroundColor: 'transparent' },
  label: { fontFamily: brandFont.body800, fontSize: 16, flexShrink: 1 },
  labelS: { fontSize: 15 },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.85 },
});
