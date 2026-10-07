import React, { useMemo } from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../../context/ThemeContext';
import { brandFont } from '../../../../theme/typography';
import { radius, type as typeTokens, type BrandPalette, type CategoryPalette } from '../../../../theme/tokens';

function useBannerStyles() {
  const { brand, category } = useTheme();
  return useMemo(() => createStyles(brand, category), [brand, category]);
}

export function SelectionHintCard({ selectAllLabel }: { selectAllLabel: string }) {
  const styles = useBannerStyles();
  const { category } = useTheme();
  return (
    <View style={styles.hintCard}>
      <View style={styles.hintIcon}>
        <Ionicons name="hand-left-outline" size={22} color={category.activity} />
      </View>
      <View style={styles.textWrap}>
        <Text style={styles.hintTitle}>Who is this update for?</Text>
        <Text style={styles.hintBody}>Tap a child above, use {selectAllLabel}, or tap search to find someone.</Text>
      </View>
    </View>
  );
}

export function TimesBanner() {
  const styles = useBannerStyles();
  const { category } = useTheme();
  return (
    <View style={styles.times}>
      <View style={styles.timesIcon}>
        <Ionicons name="time-outline" size={18} color={category.onCategory} />
      </View>
      <View style={styles.textWrap}>
        <Text style={styles.timesTitle}>Times</Text>
        <Text style={styles.timesBody}>The time is recorded when you tap Post. You don’t need to set the clock here.</Text>
      </View>
    </View>
  );
}

export function SavingOverlay({ visible }: { visible: boolean }) {
  const styles = useBannerStyles();
  const { brand } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => {}}>
      <View style={styles.overlay}>
        <View style={styles.saving} accessibilityLiveRegion="polite">
          <ActivityIndicator size="large" color={brand.textPrimary} />
          <Text style={styles.savingText}>Saving…</Text>
          <Text style={styles.savingHint}>Please wait</Text>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(brand: BrandPalette, category: CategoryPalette) {
  return StyleSheet.create({
    textWrap: { flex: 1, minWidth: 0, gap: 4 },
    hintCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 14,
      padding: 18,
      borderRadius: radius.card,
      marginBottom: 16,
      backgroundColor: category.activity,
    },
    hintIcon: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: category.onCategory,
      alignItems: 'center',
      justifyContent: 'center',
      transform: [{ rotate: '-8deg' }],
    },
    hintTitle: { fontFamily: brandFont.display800, fontSize: 19, letterSpacing: -0.19, color: category.onCategory },
    hintBody: { fontFamily: brandFont.body500, fontSize: 14, lineHeight: 20, color: '#3D3300' },
    times: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, backgroundColor: brand.surface, padding: 18, borderRadius: radius.card, marginBottom: 16 },
    timesIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: category.checkOut, alignItems: 'center', justifyContent: 'center' },
    timesTitle: { ...typeTokens.overline, fontSize: 12, color: brand.textSecondary },
    timesBody: { fontFamily: brandFont.body500, fontSize: 14, lineHeight: 21, color: brand.textSecondary },
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 24 },
    saving: { backgroundColor: brand.surface, borderRadius: radius.card, padding: 28, alignItems: 'center', minWidth: 180 },
    savingText: { fontSize: 18, fontFamily: brandFont.body800, color: brand.textPrimary, marginTop: 12 },
    savingHint: { fontSize: 14, fontFamily: brandFont.body500, color: brand.textTertiary, marginTop: 4 },
  });
}
