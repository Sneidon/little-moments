import React from 'react';
import { View, type ViewStyle } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { Skeleton } from '../Skeleton';
import { radius } from '../../theme/tokens';

export function BrandSkeletonStudentCard({ style, compact }: { style?: ViewStyle; compact?: boolean }) {
  const { brand } = useTheme();
  const avatar = compact ? 52 : 64;
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 14,
          padding: 16,
          borderRadius: radius.card,
          backgroundColor: brand.surface,
        },
        style,
      ]}
    >
      <Skeleton width={avatar} height={avatar} borderRadius={compact ? 18 : radius.tile} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Skeleton width="62%" height={18} borderRadius={6} />
        <Skeleton width="40%" height={12} borderRadius={6} style={{ marginTop: 10 }} />
      </View>
      {compact ? null : <Skeleton width={48} height={48} borderRadius={24} />}
    </View>
  );
}

export function BrandSkeletonTile({ height = 150, style }: { height?: number; style?: ViewStyle }) {
  return <Skeleton height={height} borderRadius={radius.cardL} style={{ flex: 1, ...style }} />;
}
