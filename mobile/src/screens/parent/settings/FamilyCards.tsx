import React, { useMemo } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../context/ThemeContext';
import { SettingsNote, SettingsSection } from '../../../features/settings/SettingsSection';
import { brandFont } from '../../../theme/typography';
import { radius, type BrandPalette, type CategoryPalette } from '../../../theme/tokens';
import { getAge, getInitials } from '../../../utils';
import type { Child, School } from '@shared/types';

function useCardStyles() {
  const { brand, category } = useTheme();
  return useMemo(() => createStyles(brand, category), [brand, category]);
}

function Line({ label, value, lines = 1 }: { label: string; value: string; lines?: number }) {
  const styles = useCardStyles();
  return (
    <>
      <View style={styles.divider} />
      <View style={styles.line}>
        <Text style={styles.lineLabel}>{label}</Text>
        <Text style={styles.lineValue} numberOfLines={lines}>
          {value}
        </Text>
      </View>
    </>
  );
}

export function ChildCard({ child, className }: { child: Child; className: string | null }) {
  const styles = useCardStyles();
  const { category } = useTheme();
  return (
    <SettingsSection title="Family">
      <View style={styles.body}>
        <View style={styles.header}>
          <View style={[styles.avatar, { backgroundColor: category.nap }]}>
            {child.photoURL ? (
              <Image source={{ uri: child.photoURL }} style={styles.avatarImg} />
            ) : (
              <Text style={styles.avatarText}>{getInitials(child.name)}</Text>
            )}
          </View>
          <View style={styles.headerText}>
            <Text style={styles.name} numberOfLines={1}>
              {child.name}
            </Text>
            <Text style={styles.meta} numberOfLines={1}>
              {getAge(child.dateOfBirth)} old{className ? ` · ${className}` : ''}
            </Text>
          </View>
        </View>
        {child.allergies?.length ? (
          <View style={styles.allergy}>
            <Ionicons name="warning-outline" size={16} color={category.onCategory} />
            <Text style={styles.allergyText} numberOfLines={1}>
              {child.allergies.join(', ')}
            </Text>
          </View>
        ) : null}
        {child.emergencyContact ? <Line label="Emergency" value={child.emergencyContact} /> : null}
      </View>
    </SettingsSection>
  );
}

export function DaycareCard({ school }: { school: School | null }) {
  const styles = useCardStyles();
  const { category } = useTheme();
  return (
    <SettingsSection title="Daycare">
      {school ? (
        <View style={styles.body}>
          <View style={styles.header}>
            <View style={[styles.avatar, { backgroundColor: category.attendance }]}>
              <Ionicons name="business-outline" size={20} color={category.onCategory} />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.name} numberOfLines={1}>
                {school.name}
              </Text>
              <Text style={styles.meta} numberOfLines={1}>
                {school.contactPhone || school.contactEmail || 'No contact info'}
              </Text>
            </View>
          </View>
          {school.address ? <Line label="Address" value={school.address} lines={2} /> : null}
        </View>
      ) : (
        <SettingsNote>School details couldn&apos;t be loaded.</SettingsNote>
      )}
    </SettingsSection>
  );
}

function createStyles(brand: BrandPalette, category: CategoryPalette) {
  return StyleSheet.create({
    body: { paddingHorizontal: 16, paddingVertical: 10, gap: 10 },
    header: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    avatar: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
    avatarImg: { width: 44, height: 44 },
    avatarText: { fontFamily: brandFont.display800, fontSize: 16, color: category.onCategory },
    headerText: { flex: 1, minWidth: 0, gap: 2 },
    name: { fontFamily: brandFont.body800, fontSize: 16, color: brand.textPrimary },
    meta: { fontFamily: brandFont.body500, fontSize: 14, color: brand.textSecondary },
    allergy: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      alignSelf: 'flex-start',
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: radius.pill,
      backgroundColor: category.meal,
    },
    allergyText: { fontFamily: brandFont.body800, fontSize: 13, color: category.onCategory },
    divider: { height: StyleSheet.hairlineWidth, backgroundColor: brand.disabledBorder },
    line: { flexDirection: 'row', gap: 12 },
    lineLabel: { width: 80, fontFamily: brandFont.body700, fontSize: 13, color: brand.textTertiary },
    lineValue: { flex: 1, fontFamily: brandFont.body500, fontSize: 14, color: brand.textSecondary },
  });
}
