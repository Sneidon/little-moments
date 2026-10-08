import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../../context/ThemeContext';
import { RoundIconButton } from '../../../../components/brand/RoundIconButton';
import { PrimaryButton, OutlineButton } from '../../../../components/brand/Buttons';
import { Skeleton } from '../../../../components/Skeleton';
import { brandFont } from '../../../../theme/typography';
import { avatarCategoryColor, radius, spacing, type BrandPalette } from '../../../../theme/tokens';
import { selectAllChildrenLabel } from '../../../../utils/childPresence';
import type { Child, ReportType } from '@shared/types';
import { CardHeading, useCardStyles } from './CardHeading';
import { ChildTile } from './ChildTile';

const WHO_HINTS: Partial<Record<ReportType, string>> = {
  check_in: 'Only children not yet checked in can be selected.',
  check_out: 'Only checked-in children can be checked out.',
};

type Props = {
  type: ReportType;
  children: Child[];
  rosterLoaded: boolean;
  selectedIds: string[];
  selectedChildren: Child[];
  isEligible: (childId: string) => boolean;
  hasOverride: (childId: string) => boolean;
  onToggle: (childId: string) => void;
  onSelectAll: () => void;
  onClear: () => void;
  onSearch: () => void;
  onEditVariation: (childId: string) => void;
};

export function WhoCard(props: Props) {
  const { type, children, rosterLoaded, selectedIds, selectedChildren, isEligible } = props;
  const { brand, category } = useTheme();
  const card = useCardStyles();
  const styles = useMemo(() => createStyles(brand), [brand]);
  const { width } = useWindowDimensions();
  const tileWidth = Math.floor((width - spacing.screenX * 2 - spacing.cardPadding * 2 - 20) / 3);
  const hint = WHO_HINTS[type] ?? 'Only checked-in children can receive this update.';

  if (!rosterLoaded) {
    return (
      <View style={card.card} accessibilityState={{ busy: true }}>
        <CardHeading eyebrow="Who" title="Receives this update" hint="Fetching your class roster. You can select children here in a moment." />
        <View style={styles.grid}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} width={tileWidth} height={112} borderRadius={radius.tile} />
          ))}
        </View>
      </View>
    );
  }

  if (children.length === 0) {
    return (
      <View style={card.card}>
        <CardHeading eyebrow="Who" title="Receives this update" />
        <View style={styles.empty}>
          <Ionicons name="people-outline" size={40} color={brand.textTertiary} />
          <Text style={styles.emptyTitle}>No children in your class</Text>
          <Text style={styles.emptyHint}>When children are enrolled in your assigned class, they’ll appear here.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={card.card}>
      <CardHeading
        eyebrow="Who"
        title="Receives this update"
        hint={hint}
        accessory={<RoundIconButton icon="search-outline" variant="raised" accessibilityLabel="Search children" onPress={props.onSearch} />}
      />
      <View style={styles.grid}>
        {children.map((c, index) => (
          <ChildTile
            key={c.id}
            child={c}
            width={tileWidth}
            color={avatarCategoryColor(category, index)}
            selected={selectedIds.includes(c.id)}
            eligible={isEligible(c.id)}
            unavailableReason={type === 'check_in' ? 'already checked in' : 'not checked in'}
            onPress={() => props.onToggle(c.id)}
          />
        ))}
      </View>
      <View style={styles.actions}>
        <PrimaryButton label={selectAllChildrenLabel(type)} icon="checkmark-done" size="s" style={styles.action} onPress={props.onSelectAll} />
        <OutlineButton label="Clear" icon="close-circle-outline" size="s" style={styles.action} onPress={props.onClear} />
      </View>
      {selectedChildren.length > 1 ? (
        <>
          <Text style={styles.variationLabel}>
            {type === 'nap_time'
              ? 'Different nap times per child? Tap a name (e.g. early pickup):'
              : 'Different details per child? Tap a name:'}
          </Text>
          <View style={styles.chips}>
            {selectedChildren.map((c) => (
              <TouchableOpacity
                key={c.id}
                style={[styles.chip, props.hasOverride(c.id) && styles.chipActive]}
                onPress={() => props.onEditVariation(c.id)}
                accessibilityRole="button"
                accessibilityLabel={`Different details for ${c.name}`}
              >
                <Text style={styles.chipText} numberOfLines={1}>
                  {c.name.split(' ')[0]}
                </Text>
                <Ionicons name="create-outline" size={14} color={brand.textPrimary} />
              </TouchableOpacity>
            ))}
          </View>
        </>
      ) : null}
    </View>
  );
}

function createStyles(brand: BrandPalette) {
  return StyleSheet.create({
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    actions: { flexDirection: 'row', gap: 10, marginTop: 18 },
    action: { flex: 1 },
    empty: { alignItems: 'center', paddingVertical: 28, paddingHorizontal: 20, borderRadius: radius.tile, backgroundColor: brand.surfaceRaised },
    emptyTitle: { fontSize: 17, fontFamily: brandFont.body700, color: brand.textPrimary, marginTop: 14, textAlign: 'center' },
    emptyHint: { fontSize: 14, lineHeight: 20, fontFamily: brandFont.body500, color: brand.textTertiary, marginTop: 8, textAlign: 'center' },
    variationLabel: { fontSize: 13, fontFamily: brandFont.body500, color: brand.textSecondary, marginTop: 14, marginBottom: 4 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      minHeight: 44,
      paddingHorizontal: 14,
      borderRadius: radius.chip,
      backgroundColor: brand.surfaceRaised,
      borderWidth: 2,
      borderColor: brand.surfaceRaised,
      maxWidth: '48%',
    },
    chipActive: { borderColor: brand.textPrimary },
    chipText: { fontSize: 13, fontFamily: brandFont.body700, color: brand.textPrimary, flexShrink: 1 },
  });
}
