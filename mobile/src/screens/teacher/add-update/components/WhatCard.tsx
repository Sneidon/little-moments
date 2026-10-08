import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../../../context/ThemeContext';
import { CategoryIconTile } from '../../../../components/brand/CategoryIconTile';
import { brandFont } from '../../../../theme/typography';
import { radius, updateTypeStyle } from '../../../../theme/tokens';
import type { ReportType } from '@shared/types';
import { ACTIVITY_TABS } from '../constants';
import { CardHeading, useCardStyles } from './CardHeading';

type Props = { type: ReportType; onChange: (type: ReportType) => void };

export function WhatCard({ type, onChange }: Props) {
  const { brand, category } = useTheme();
  const card = useCardStyles();
  const label = ACTIVITY_TABS.find((t) => t.type === type)?.label ?? 'Meal';
  return (
    <View style={card.card}>
      <CardHeading
        eyebrow="What"
        title="Type of update"
        hint="Pick what you’re logging. You can change it anytime."
        accessory={
          <View style={[styles.badge, { backgroundColor: brand.surfaceRaised }]}>
            <Text style={[styles.badgeText, { color: brand.textPrimary }]} numberOfLines={1}>
              {label}
            </Text>
          </View>
        }
      />
      <View style={styles.grid}>
        {ACTIVITY_TABS.map((tab) => {
          const style = updateTypeStyle(tab.type);
          return (
            <View key={tab.type} style={styles.cell}>
              <CategoryIconTile
                label={tab.label}
                icon={style.icon}
                color={category[style.category]}
                selected={type === tab.type}
                onPress={() => onChange(tab.type)}
              />
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.chip, maxWidth: 110 },
  badgeText: { fontSize: 13, fontFamily: brandFont.body800 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 18 },
  cell: { width: '25%', alignItems: 'center' },
});
