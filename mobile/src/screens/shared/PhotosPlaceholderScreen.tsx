import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

export function PhotosPlaceholderScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.container}>
      <Ionicons name="images-outline" size={64} color={colors.textMuted} style={styles.icon} />
      <Text style={styles.title}>Photos</Text>
      <Text style={styles.subtitle}>Daily moments</Text>
      <Text style={styles.placeholder}>Photo sharing will be available in a future update.</Text>
    </View>
  );
}

function createStyles(colors: import('../../theme/colors').ColorPalette) {
  return StyleSheet.create({
    container: { flex: 1, padding: 16, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' },
    icon: { marginBottom: 16 },
    title: { fontSize: 20, fontWeight: '700', color: colors.text },
    subtitle: { fontSize: 14, color: colors.textMuted, marginTop: 4 },
    placeholder: { fontSize: 14, color: colors.textMuted, marginTop: 24, textAlign: 'center' },
  });
}
