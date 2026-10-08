import React, { useEffect, useRef } from 'react';
import { Animated, View, type ViewStyle } from 'react-native';
import { useTheme } from '../context/ThemeContext';

type DimensionValue = number | `${number}%` | 'auto';

type SkeletonProps = {
  width?: DimensionValue;
  height?: DimensionValue;
  borderRadius?: number;
  style?: ViewStyle;
  animate?: boolean;
};

export function Skeleton({ width, height = 16, borderRadius = 6, style, animate = true }: SkeletonProps) {
  const { colors } = useTheme();
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    if (!animate) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.8, duration: 600, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 600, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [animate, opacity]);

  return (
    <Animated.View
      style={[{ width, height, borderRadius, backgroundColor: colors.skeleton }, animate ? { opacity } : { opacity: 1 }, style]}
    />
  );
}

export function SkeletonCard({ style }: { style?: ViewStyle }) {
  const { colors } = useTheme();
  return (
    <View style={[{ padding: 16, borderRadius: 12, marginBottom: 12, backgroundColor: colors.card }, style]}>
      <Skeleton width="80%" height={18} style={{ marginBottom: 8 }} />
      <Skeleton width="100%" height={14} style={{ marginBottom: 4 }} />
      <Skeleton width="90%" height={14} style={{ marginBottom: 12 }} />
      <Skeleton width={100} height={12} />
    </View>
  );
}
