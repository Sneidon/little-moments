import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../../context/ThemeContext';
import { PrimaryButton } from '../../../../components/brand/Buttons';
import { brandFont } from '../../../../theme/typography';
import { radius, type as typeTokens, type BrandPalette, type CategoryPalette } from '../../../../theme/tokens';
import { getAge, getInitials } from '../../../../utils';
import { KeyboardAvoider, keyboardScrollProps } from '../../../../components/KeyboardAvoider';
import type { Child } from '@shared/types';

type Props = {
  visible: boolean;
  children: Child[];
  selectedIds: string[];
  isEligible: (childId: string) => boolean;
  onToggle: (childId: string) => void;
  onSelectAll: () => void;
  onClear: () => void;
  onClose: () => void;
};

export function ChildSearchModal({ visible, children, selectedIds, isEligible, onToggle, onSelectAll, onClear, onClose }: Props) {
  const { brand, category } = useTheme();
  const styles = useMemo(() => createStyles(brand, category), [brand, category]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!visible) setSearch('');
  }, [visible]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? children.filter((c) => c.name.toLowerCase().includes(q)) : children;
  }, [children, search]);

  const quick = (label: string, icon: React.ComponentProps<typeof Ionicons>['name'], onPress: () => void) => (
    <TouchableOpacity onPress={onPress} style={styles.quick} accessibilityRole="button">
      <Ionicons name={icon} size={18} color={brand.textPrimary} />
      <Text style={styles.quickText}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoider>
        <View style={styles.backdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Dismiss" accessibilityRole="button" />
          <View style={styles.content}>
            <Text style={styles.title} accessibilityRole="header">
              Class list
            </Text>
            <Text style={styles.subtitle}>Tap a row to toggle selection (same as the photos above).</Text>
            <View style={styles.search}>
              <Ionicons name="search" size={20} color={brand.textTertiary} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by name…"
                placeholderTextColor={brand.textTertiary}
                value={search}
                onChangeText={setSearch}
                autoCorrect={false}
                autoCapitalize="words"
                accessibilityLabel="Search by name"
              />
              {search ? (
                <TouchableOpacity onPress={() => setSearch('')} hitSlop={12} accessibilityRole="button" accessibilityLabel="Clear search">
                  <Ionicons name="close-circle" size={22} color={brand.textTertiary} />
                </TouchableOpacity>
              ) : null}
            </View>
            <View style={styles.quickRow}>
              {quick('All', 'checkmark-done-outline', onSelectAll)}
              {quick('None', 'close-circle-outline', onClear)}
            </View>
            <ScrollView style={styles.list} {...keyboardScrollProps}>
              {filtered.length === 0 ? (
                <Text style={styles.empty}>No names match “{search.trim()}”</Text>
              ) : (
                filtered.map((c) => {
                  const selected = selectedIds.includes(c.id);
                  const eligible = isEligible(c.id);
                  return (
                    <TouchableOpacity
                      key={c.id}
                      style={[styles.row, selected && styles.rowSelected, !eligible && styles.rowDisabled]}
                      onPress={() => onToggle(c.id)}
                      disabled={!eligible}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: selected, disabled: !eligible }}
                    >
                      <View style={styles.avatar}>
                        <Text style={styles.initials}>{getInitials(c.name)}</Text>
                      </View>
                      <View style={styles.rowText}>
                        <Text style={styles.name}>{c.name}</Text>
                        <Text style={styles.age}>{getAge(c.dateOfBirth)} old</Text>
                      </View>
                      <View style={[styles.checkbox, selected && styles.checkboxOn]}>
                        {selected ? <Ionicons name="checkmark" size={16} color={brand.onInverse} /> : null}
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
            <PrimaryButton label={`Done (${selectedIds.length} selected)`} size="s" style={styles.done} onPress={onClose} />
          </View>
        </View>
      </KeyboardAvoider>
    </Modal>
  );
}

function createStyles(brand: BrandPalette, category: CategoryPalette) {
  return StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
    content: { backgroundColor: brand.surface, borderRadius: radius.cardL, padding: 20, maxHeight: '88%', width: '100%', maxWidth: 400, alignSelf: 'center' },
    title: { ...typeTokens.cardTitle, color: brand.textPrimary },
    subtitle: { fontFamily: brandFont.body500, fontSize: 14, lineHeight: 20, color: brand.textTertiary, marginTop: 4, marginBottom: 14 },
    search: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: brand.surfaceRaised, borderRadius: radius.chip, paddingHorizontal: 12, marginBottom: 12 },
    searchInput: { flex: 1, paddingVertical: 12, fontSize: 16, fontFamily: brandFont.body400, color: brand.textPrimary },
    quickRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
    quick: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 40, paddingHorizontal: 14, borderRadius: radius.chip, backgroundColor: brand.surfaceRaised },
    quickText: { fontSize: 14, fontFamily: brandFont.body700, color: brand.textPrimary },
    list: { maxHeight: 360 },
    empty: { paddingVertical: 28, textAlign: 'center', color: brand.textTertiary, fontSize: 15, fontFamily: brandFont.body500 },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 10,
      borderRadius: radius.chip,
      marginBottom: 8,
      borderWidth: 2,
      borderColor: brand.surfaceRaised,
      backgroundColor: brand.surfaceRaised,
    },
    rowSelected: { borderColor: brand.textPrimary },
    rowDisabled: { opacity: 0.45 },
    avatar: { width: 48, height: 48, borderRadius: 16, backgroundColor: category.nap, alignItems: 'center', justifyContent: 'center' },
    initials: { fontFamily: brandFont.display800, fontSize: 17, color: category.onCategory },
    rowText: { flex: 1, minWidth: 0 },
    name: { fontSize: 16, fontFamily: brandFont.body700, color: brand.textPrimary },
    age: { fontSize: 13, fontFamily: brandFont.body500, color: brand.textTertiary, marginTop: 2 },
    checkbox: { width: 26, height: 26, borderRadius: 8, borderWidth: 2, borderColor: brand.disabledBorder, alignItems: 'center', justifyContent: 'center' },
    checkboxOn: { backgroundColor: brand.inverseFill, borderColor: brand.inverseFill },
    done: { marginTop: 16 },
  });
}
