import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../../../context/ThemeContext';
import { useThemedStyles, type Theme } from '../../../../hooks/useThemedStyles';
import { HeaderBlock, DisplayTitle } from '../../../../components/brand/HeaderBlock';
import { RoundIconButton } from '../../../../components/brand/RoundIconButton';
import { brandFont } from '../../../../theme/typography';
import { radius, spacing } from '../../../../theme/tokens';

type Props = { whoStepActive: boolean; onBack: () => void };

export function AddUpdateHeader({ whoStepActive, onBack }: Props) {
  const { brand, category } = useTheme();
  const styles = useThemedStyles(createStyles);

  const step = (num: number, label: string, active: boolean) => (
    <View style={[styles.pill, active ? styles.pillActive : styles.pillIdle]}>
      <View style={[styles.num, active ? styles.numActive : styles.numIdle]}>
        <Text style={[styles.numText, { color: active ? category.activity : brand.onHeader }]}>{num}</Text>
      </View>
      <Text style={[styles.label, { color: active ? category.onCategory : brand.onHeader }]}>{label}</Text>
    </View>
  );

  return (
    <HeaderBlock style={styles.header} paddingBottom={28} gap={20}>
      <View>
        <RoundIconButton icon="chevron-back" variant="onHeader" accessibilityLabel="Back" onPress={onBack} />
      </View>
      <DisplayTitle>Add Update</DisplayTitle>
      <View style={styles.steps} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        {step(1, 'Who', whoStepActive)}
        {step(2, 'What', !whoStepActive)}
      </View>
    </HeaderBlock>
  );
}

function createStyles({ category }: Theme) {
  return StyleSheet.create({
    header: { marginHorizontal: -spacing.screenX, marginBottom: spacing.gapL },
    steps: { flexDirection: 'row', gap: 8 },
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      borderRadius: radius.pill,
      paddingVertical: 4,
      paddingLeft: 4,
      paddingRight: 14,
      borderWidth: 2,
    },
    pillActive: { backgroundColor: category.activity, borderColor: category.activity },
    pillIdle: { borderColor: 'rgba(255,255,255,0.35)' },
    num: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    numActive: { backgroundColor: category.onCategory },
    numIdle: { backgroundColor: 'rgba(255,255,255,0.2)' },
    numText: { fontFamily: brandFont.body800, fontSize: 13 },
    label: { fontFamily: brandFont.body800, fontSize: 14 },
  });
}
