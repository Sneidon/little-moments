import React, { useMemo } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../../context/ThemeContext';
import { brandFont } from '../../../../theme/typography';
import { radius, type BrandPalette } from '../../../../theme/tokens';
import type { MealOption } from '@shared/types';
import { MEAL_AMOUNTS, MEAL_TYPES } from '../constants';
import { FieldLabel, TextField } from '../fields';
import { useFormStyles } from '../useFormStyles';
import type { FieldsChange, FormVariant, UpdateFields } from '../types';

type Props = {
  values: UpdateFields;
  onChange: FieldsChange;
  variant: FormVariant;
  mealOptions: MealOption[];
  clock: string;
};

export function MealFields({ values, onChange, variant, mealOptions, clock }: Props) {
  const { brand } = useTheme();
  const s = useFormStyles();
  const styles = useMemo(() => createStyles(brand), [brand]);
  const options = mealOptions.filter((o) => o.category === values.mealType);
  const isMain = variant === 'main';

  return (
    <>
      {isMain ? (
        <>
          <FieldLabel>Meal Type</FieldLabel>
          <View style={styles.typeRow}>
            {MEAL_TYPES.map((m) => {
              const active = values.mealType === m.value;
              return (
                <TouchableOpacity
                  key={m.value}
                  style={[styles.typePill, active && styles.typePillActive]}
                  onPress={() => onChange({ mealType: m.value, mealOptionId: null, mealOptionName: '' })}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: active }}
                >
                  <Text style={[styles.typeText, active && styles.typeTextActive]}>{m.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </>
      ) : null}

      <FieldLabel>Menu item (optional)</FieldLabel>
      {options.length === 0 ? (
        <Text style={s.helper}>
          {isMain
            ? `No menu items for ${values.mealType} yet. You can still post this meal. Your principal can add items in Meal options later.`
            : `No menu items for ${values.mealType}.`}
        </Text>
      ) : (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.optionsRow}>
            {options.map((opt) => {
              const active = values.mealOptionId === opt.id;
              return (
                <TouchableOpacity
                  key={opt.id}
                  style={[styles.optionCard, active && styles.optionCardActive]}
                  onPress={() =>
                    onChange(active ? { mealOptionId: null, mealOptionName: '' } : { mealOptionId: opt.id, mealOptionName: opt.name })
                  }
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  {opt.imageUrl ? (
                    <Image source={{ uri: opt.imageUrl }} style={styles.optionImage} resizeMode="cover" />
                  ) : (
                    <View style={[styles.optionImage, styles.optionImagePlaceholder]}>
                      <Ionicons name="restaurant-outline" size={24} color={brand.textTertiary} />
                    </View>
                  )}
                  <Text style={styles.optionName} numberOfLines={2}>
                    {opt.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          {isMain ? <Text style={[s.helper, { marginTop: 6 }]}>Optional. Tap a card to select; tap again to clear.</Text> : null}
        </>
      )}

      <FieldLabel>How much did they eat?</FieldLabel>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.amountRow}>
        {MEAL_AMOUNTS.map((a) => {
          const active = values.mealAmount === a.value;
          return (
            <TouchableOpacity
              key={a.value}
              style={styles.amountItem}
              onPress={() => onChange({ mealAmount: a.value })}
              accessibilityRole="radio"
              accessibilityLabel={a.label}
              accessibilityState={{ checked: active }}
            >
              <View style={[styles.amountCircle, active && styles.amountCircleActive]}>
                <Text style={[styles.amountCircleText, active && styles.amountCircleTextActive]}>{a.circleText}</Text>
              </View>
              <Text style={[styles.amountLabel, active && styles.amountLabelActive]}>{a.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {isMain ? <TextField label="Time" value={clock} placeholder="12:00" readOnly /> : null}
    </>
  );
}

function createStyles(brand: BrandPalette) {
  return StyleSheet.create({
    typeRow: { flexDirection: 'row', gap: 8 },
    typePill: {
      flex: 1,
      minHeight: 44,
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: radius.chip,
      backgroundColor: brand.surfaceRaised,
    },
    typePillActive: { backgroundColor: brand.inverseFill },
    typeText: { fontSize: 14, fontFamily: brandFont.body700, color: brand.textSecondary },
    typeTextActive: { fontFamily: brandFont.body800, color: brand.onInverse },
    optionsRow: { gap: 10, paddingRight: 16 },
    optionCard: {
      width: 120,
      borderRadius: radius.chip,
      borderWidth: 2.5,
      borderColor: brand.surfaceRaised,
      backgroundColor: brand.surfaceRaised,
      overflow: 'hidden',
    },
    optionCardActive: { borderColor: brand.textPrimary },
    optionImage: { width: '100%', height: 72 },
    optionImagePlaceholder: { backgroundColor: brand.disabledBorder, alignItems: 'center', justifyContent: 'center' },
    optionName: { fontSize: 12, fontFamily: brandFont.body800, color: brand.textPrimary, padding: 6 },
    amountRow: { gap: 10, paddingVertical: 6, paddingRight: 8 },
    amountItem: { alignItems: 'center', minWidth: 62 },
    amountCircle: {
      width: 52,
      height: 52,
      borderRadius: 26,
      borderWidth: 2,
      borderColor: 'transparent',
      backgroundColor: brand.surfaceRaised,
      alignItems: 'center',
      justifyContent: 'center',
    },
    amountCircleActive: { borderColor: brand.inverseFill, backgroundColor: brand.inverseFill },
    amountCircleText: { fontSize: 12, fontFamily: brandFont.body700, color: brand.textSecondary, textAlign: 'center', paddingHorizontal: 4 },
    amountCircleTextActive: { fontFamily: brandFont.body800, color: brand.onInverse },
    amountLabel: { fontSize: 12, fontFamily: brandFont.body700, color: brand.textSecondary, marginTop: 6, textAlign: 'center' },
    amountLabelActive: { fontFamily: brandFont.body800, color: brand.textPrimary },
  });
}
