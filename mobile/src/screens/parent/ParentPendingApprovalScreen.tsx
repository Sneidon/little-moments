import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { font } from '../../theme/typography';

export function ParentPendingApprovalScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Pending approval</Text>
        <Text style={styles.subtitle}>
          Your registration is being reviewed by your child’s teacher. You’ll get an email once you’re approved.
        </Text>
      </View>
    </View>
  );
}

function createStyles(colors: import('../../theme/colors').ColorPalette) {
  const f = (w: 'regular' | 'medium' | 'semiBold' | 'bold') => ({ fontFamily: font[w] });
  return StyleSheet.create({
    container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16, backgroundColor: colors.backgroundSecondary },
    card: {
      width: '100%',
      maxWidth: 420,
      backgroundColor: colors.card,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      padding: 16,
    },
    title: { fontSize: 18, color: colors.text, ...f('bold') },
    subtitle: { marginTop: 8, fontSize: 13, color: colors.textMuted, ...f('medium') },
  });
}

