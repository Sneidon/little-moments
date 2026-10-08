import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { StatTile } from '../../components/brand/StatTile';
import { Skeleton } from '../../components/Skeleton';
import { radius } from '../../theme/tokens';

type Props = {
  loading: boolean;
  meals: number;
  napDuration: string;
  nappy: number;
  activities: number;
};

export function DayOverview({ loading, meals, napDuration, nappy, activities }: Props) {
  const { category } = useTheme();
  if (loading) {
    return (
      <View style={styles.grid}>
        {[0, 1].map((row) => (
          <View key={row} style={styles.row}>
            <Skeleton height={130} borderRadius={radius.card} style={{ flex: 1 }} />
            <Skeleton height={130} borderRadius={radius.card} style={{ flex: 1 }} />
          </View>
        ))}
      </View>
    );
  }
  return (
    <View style={styles.grid}>
      <View style={styles.row}>
        <StatTile label="Meals" value={meals} suffix="/3" icon="restaurant-outline" color={category.meal} />
        <StatTile label="Nap" value={napDuration} icon="moon-outline" color={category.napStat} />
      </View>
      <View style={styles.row}>
        <StatTile label="Nappy" value={nappy} icon="water-outline" color={category.attendance} />
        <StatTile label="Activities" value={activities} icon="color-palette-outline" color={category.activity} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { gap: 12 },
  row: { flexDirection: 'row', gap: 12 },
});
