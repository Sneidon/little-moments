import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

const STRIPE = 8;
const COUNT = 30;

/**
 * Diagonal (135°) stripes in disabledHatchA / disabledHatchB, filling its
 * parent. Drawn with rotated Views so no SVG or gradient dependency is needed.
 * The parent must set overflow: 'hidden' and a borderRadius if it wants clipping.
 */
export function HatchedBackground() {
  const { brand } = useTheme();
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.clip, { backgroundColor: brand.disabledHatchA }]}>
      <View style={styles.rotator}>
        {Array.from({ length: COUNT }, (_, i) => (
          <View
            key={i}
            style={[styles.stripe, { left: i * STRIPE * 2 + STRIPE, backgroundColor: brand.disabledHatchB }]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  clip: { overflow: 'hidden' },
  rotator: {
    position: 'absolute',
    width: COUNT * STRIPE * 2,
    height: COUNT * STRIPE * 2,
    left: -(COUNT * STRIPE) / 2,
    top: -(COUNT * STRIPE) / 2,
    transform: [{ rotate: '45deg' }],
  },
  stripe: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: STRIPE,
  },
});
