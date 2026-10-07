import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../../../../context/ThemeContext';
import { CheckBadge } from '../../../../components/brand/CategoryIconTile';
import { HatchedBackground } from '../../../../components/brand/HatchedBackground';
import { brandFont } from '../../../../theme/typography';
import { radius, type BrandPalette, type CategoryPalette } from '../../../../theme/tokens';
import { getInitials } from '../../../../utils';
import type { Child } from '@shared/types';

type Props = {
  child: Child;
  width: number;
  color: string;
  selected: boolean;
  eligible: boolean;
  unavailableReason: string;
  onPress: () => void;
};

export function ChildTile({ child, width, color, selected, eligible, unavailableReason, onPress }: Props) {
  const { brand, category } = useTheme();
  const styles = useMemo(() => createStyles(brand, category), [brand, category]);
  const name = child.name.trim();
  const firstName = name.split(/\s+/)[0] || child.name;
  const surname = name.includes(' ') ? name.slice(name.indexOf(' ') + 1) : '';

  return (
    <TouchableOpacity
      style={[styles.tile, { width }, eligible ? styles.eligible : styles.disabled, selected && styles.selected]}
      onPress={onPress}
      activeOpacity={eligible ? 0.85 : 1}
      disabled={!eligible}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected, disabled: !eligible }}
      accessibilityLabel={eligible ? `${child.name}, ${selected ? 'selected' : 'not selected'}` : `${child.name}, ${unavailableReason}`}
    >
      {!eligible ? <HatchedBackground /> : null}
      <View style={[styles.avatar, { backgroundColor: eligible ? color : brand.disabledAvatar }]}>
        <Text style={[styles.initials, !eligible && { color: brand.disabledText }]}>{getInitials(child.name)}</Text>
      </View>
      <Text style={[styles.name, !eligible && { color: brand.textSecondary }]} numberOfLines={1}>
        {firstName}
      </Text>
      <Text style={[styles.surname, !eligible && { color: brand.disabledText }]} numberOfLines={1}>
        {surname || ' '}
      </Text>
      {selected ? <CheckBadge style={styles.check} /> : null}
    </TouchableOpacity>
  );
}

function createStyles(brand: BrandPalette, category: CategoryPalette) {
  return StyleSheet.create({
    tile: {
      alignItems: 'center',
      gap: 8,
      paddingTop: 14,
      paddingBottom: 12,
      paddingHorizontal: 6,
      borderRadius: radius.tile,
      borderWidth: 2,
      overflow: 'hidden',
    },
    eligible: { backgroundColor: brand.surfaceRaised, borderColor: brand.surfaceRaised },
    disabled: { borderColor: brand.disabledBorder, borderStyle: 'dashed' },
    selected: { borderColor: brand.textPrimary, borderWidth: 2.5 },
    avatar: { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    initials: { fontFamily: brandFont.display800, fontSize: 20, color: category.onCategory },
    name: { fontFamily: brandFont.body800, fontSize: 13, lineHeight: 16, color: brand.textPrimary, maxWidth: '100%' },
    surname: {
      fontFamily: brandFont.body600,
      fontSize: 13,
      lineHeight: 16,
      marginTop: -8,
      color: brand.textTertiary,
      maxWidth: '100%',
    },
    check: { right: 6, top: 6 },
  });
}
