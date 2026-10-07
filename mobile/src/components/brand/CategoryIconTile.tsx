import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { brandFont } from '../../theme/typography';
import { radius, size as sizeTokens } from '../../theme/tokens';

type Props = {
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
  selected?: boolean;
  onPress?: () => void;
};

const RING = 3;

/**
 * 64pt category tile with label (Add update "What" grid). Selected = double
 * ring (surface, then textPrimary), −6° tilt and a check badge.
 */
export function CategoryIconTile({ label, icon, color, selected, onPress }: Props) {
  const { brand, category } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: !!selected }}
      style={styles.wrap}
    >
      <View
        style={[
          styles.outerRing,
          selected && { borderColor: brand.textPrimary, transform: [{ rotate: '-6deg' }] },
        ]}
      >
        <View style={[styles.innerRing, selected && { borderColor: brand.surface }]}>
          <View style={[styles.tile, { backgroundColor: color }]}>
            <Ionicons name={icon} size={26} color={category.onCategory} />
          </View>
        </View>
        {selected ? <CheckBadge /> : null}
      </View>
      <Text
        style={[styles.label, { color: brand.textPrimary, fontFamily: selected ? brandFont.body800 : brandFont.body700 }]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {label}
      </Text>
    </Pressable>
  );
}

/** Small check badge used on selected tiles. */
export function CheckBadge({ style }: { style?: object }) {
  const { brand } = useTheme();
  return (
    <View
      style={[styles.badge, { backgroundColor: brand.textPrimary, borderColor: brand.surface }, style]}
      pointerEvents="none"
    >
      <Ionicons name="checkmark" size={14} color={brand.surface} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 10 - RING * 2 },
  // Rings take layout space only via transparent borders, so tiles don't shift when selected.
  outerRing: {
    borderWidth: RING,
    borderColor: 'transparent',
    borderRadius: radius.tile + RING * 2,
  },
  innerRing: {
    borderWidth: RING,
    borderColor: 'transparent',
    borderRadius: radius.tile + RING,
  },
  tile: {
    width: sizeTokens.typeTile,
    height: sizeTokens.typeTile,
    borderRadius: radius.tile,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontSize: 13, maxWidth: 84 },
  badge: {
    position: 'absolute',
    right: -6 + RING,
    top: -6 + RING,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
