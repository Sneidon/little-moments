import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles, type Theme } from '../../hooks/useThemedStyles';
import { font } from '../../theme/typography';
import { softShadow } from '../../theme/shadow';

export function ClassAudienceNote() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.audienceRow}>
      <Ionicons name="people-outline" size={16} color={colors.textMuted} style={{ marginRight: 8 }} />
      <Text style={styles.audienceText}>Shared with specific classes at the school</Text>
    </View>
  );
}

export function PostSummaryCard({ children }: { children: React.ReactNode }) {
  const styles = useThemedStyles(createStyles);
  return <View style={styles.card}>{children}</View>;
}

const createStyles = ({ colors, isDark }: Theme) =>
  StyleSheet.create({
    card: {
      borderRadius: 16,
      borderWidth: 1,
      padding: 16,
      marginBottom: 14,
      backgroundColor: colors.card,
      borderColor: colors.cardBorder,
      ...softShadow(isDark, { shadowColor: '#0f172a', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6 }, 1),
    },
    audienceRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 14, padding: 12, borderRadius: 12, backgroundColor: colors.backgroundSecondary },
    audienceText: { fontSize: 13, lineHeight: 18, flex: 1, fontFamily: font.regular, color: colors.textMuted },
  });
