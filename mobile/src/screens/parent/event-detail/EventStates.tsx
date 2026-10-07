import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../context/ThemeContext';
import { useThemedStyles, type Theme } from '../../../hooks/useThemedStyles';
import { font } from '../../../theme/typography';

export function EventLoading() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.centered}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.loadingHint}>Loading event…</Text>
    </View>
  );
}

export function EventMissing({ onBack }: { onBack: () => void }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <View style={[styles.centered, { padding: 24 }]}>
      <View style={styles.iconWrap}>
        <Ionicons name="calendar-outline" size={40} color={colors.primary} />
      </View>
      <Text style={styles.title}>We couldn&apos;t load this event</Text>
      <Text style={styles.body}>
        It may have been removed, or there was a connection problem. Check your internet and try opening it again from the calendar.
      </Text>
      <TouchableOpacity style={styles.backBtn} onPress={onBack}>
        <Text style={styles.backBtnText}>Back to calendar</Text>
      </TouchableOpacity>
    </View>
  );
}

const createStyles = ({ colors }: Theme) =>
  StyleSheet.create({
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.backgroundSecondary },
    loadingHint: { marginTop: 14, fontSize: 15, fontFamily: font.medium, color: colors.textMuted },
    iconWrap: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primaryMuted },
    title: { fontSize: 19, fontFamily: font.bold, color: colors.text, marginTop: 20, textAlign: 'center', paddingHorizontal: 8 },
    body: {
      fontSize: 15,
      color: colors.textMuted,
      textAlign: 'center',
      marginTop: 10,
      lineHeight: 22,
      fontFamily: font.regular,
      paddingHorizontal: 8,
    },
    backBtn: { marginTop: 24, paddingVertical: 14, paddingHorizontal: 28, borderRadius: 14, borderWidth: 1, borderColor: colors.primary },
    backBtnText: { fontFamily: font.semiBold, fontSize: 16, color: colors.primary },
  });
