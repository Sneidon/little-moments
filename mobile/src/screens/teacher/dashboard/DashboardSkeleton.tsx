import React from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { Skeleton } from '../../../components/Skeleton';
import { BrandSkeletonStudentCard, BrandSkeletonTile } from '../../../components/brand/BrandSkeletons';
import { spacing } from '../../../theme/tokens';

export function DashboardSkeleton() {
  const { width } = useWindowDimensions();
  const tileWidth = Math.floor((width - spacing.screenX * 2 - 20) / 3);
  return (
    <>
      <BrandSkeletonTile height={200} />
      <View style={styles.row}>
        <BrandSkeletonTile height={170} />
        <BrandSkeletonTile height={170} />
      </View>
      <Skeleton width={160} height={24} borderRadius={8} style={styles.title} />
      <View style={styles.grid}>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} width={tileWidth} height={112} borderRadius={24} />
        ))}
      </View>
      {[1, 2, 3].map((i) => (
        <BrandSkeletonStudentCard key={i} compact />
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.gapM },
  title: { marginTop: 10, marginHorizontal: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
});
