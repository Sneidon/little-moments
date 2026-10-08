import React, { useMemo } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../../context/ThemeContext';
import { PrimaryButton, OutlineButton } from '../../../../components/brand/Buttons';
import { brandFont } from '../../../../theme/typography';
import { radius, type as typeTokens, type BrandPalette } from '../../../../theme/tokens';
import { KeyboardAvoider, keyboardScrollProps } from '../../../../components/KeyboardAvoider';
import type { MealOption, ReportType } from '@shared/types';
import { TextField } from '../fields';
import { UpdateFormFields } from '../UpdateFormFields';
import type { FieldsChange, UpdateFields } from '../types';

const NOTES_TYPES = new Set<ReportType>(['nap_time', 'medication', 'activity', 'nappy_change', 'check_in', 'check_out', 'incident']);

type Props = {
  type: ReportType;
  childName: string | null;
  draft: UpdateFields | null;
  onChange: FieldsChange;
  hasOverride: boolean;
  mealOptions: MealOption[];
  clock: string;
  onSave: () => void;
  onCancel: () => void;
  onReset: () => void;
};

export function VariationModal({ type, childName, draft, onChange, hasOverride, mealOptions, clock, onSave, onCancel, onReset }: Props) {
  const { brand } = useTheme();
  const styles = useMemo(() => createStyles(brand), [brand]);

  return (
    <Modal visible={childName != null} transparent animationType="fade" onRequestClose={onCancel}>
      <KeyboardAvoider>
        <View style={styles.root}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} accessibilityLabel="Dismiss" accessibilityRole="button" />
          <View style={styles.card}>
            <View style={styles.header}>
              <View style={styles.flex}>
                <Text style={styles.eyebrow}>Different for</Text>
                <Text style={styles.title} numberOfLines={2}>
                  {childName}
                </Text>
              </View>
              <TouchableOpacity style={styles.close} onPress={onCancel} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close">
                <Ionicons name="close" size={26} color={brand.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.hint}>Only fields you change here differ from the main form. Same as main = no variation.</Text>
            {draft ? (
              <ScrollView style={styles.scroll} {...keyboardScrollProps} showsVerticalScrollIndicator={false}>
                {NOTES_TYPES.has(type) ? (
                  <TextField
                    label="Notes (optional)"
                    value={draft.notes}
                    onChangeText={(notes) => onChange({ notes })}
                    placeholder="Different notes for this child..."
                    multiline
                    lines={2}
                  />
                ) : null}
                <UpdateFormFields type={type} variant="variation" values={draft} onChange={onChange} editable clock={clock} mealOptions={mealOptions} />
              </ScrollView>
            ) : null}
            <View style={styles.actions}>
              {hasOverride ? (
                <TouchableOpacity style={styles.reset} onPress={onReset} accessibilityRole="button">
                  <Text style={styles.resetText}>Reset to main form</Text>
                </TouchableOpacity>
              ) : null}
              <View style={styles.row}>
                <PrimaryButton label="Save" size="s" style={styles.flex} onPress={onSave} />
                <OutlineButton label="Cancel" size="s" style={styles.flex} onPress={onCancel} />
              </View>
            </View>
          </View>
        </View>
      </KeyboardAvoider>
    </Modal>
  );
}

function createStyles(brand: BrandPalette) {
  return StyleSheet.create({
    flex: { flex: 1 },
    root: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: 'rgba(0,0,0,0.5)' },
    card: { backgroundColor: brand.surface, borderRadius: radius.cardL, padding: 20, maxHeight: '88%' },
    header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
    eyebrow: { ...typeTokens.overline, fontSize: 12, color: brand.textSecondary },
    title: { ...typeTokens.cardTitle, color: brand.textPrimary, marginTop: 4 },
    close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
    hint: { fontFamily: brandFont.body500, fontSize: 13, lineHeight: 19, color: brand.textTertiary, marginTop: 8 },
    scroll: { flexGrow: 0, marginTop: 4 },
    actions: { marginTop: 16, gap: 10 },
    row: { flexDirection: 'row', gap: 10 },
    reset: { alignSelf: 'center', minHeight: 44, justifyContent: 'center', paddingHorizontal: 12 },
    resetText: { fontFamily: brandFont.body800, fontSize: 15, color: brand.textPrimary },
  });
}
