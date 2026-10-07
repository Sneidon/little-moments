import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../context/ThemeContext';
import { useThemedStyles, type Theme } from '../../../hooks/useThemedStyles';
import { font } from '../../../theme/typography';

export function AnnouncementsCta({ onPress }: { onPress: () => void }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <TouchableOpacity style={styles.cta} onPress={onPress} activeOpacity={0.92}>
      <View style={styles.ctaIcon}>
        <Ionicons name="megaphone" size={26} color={colors.ctaPurple} />
      </View>
      <View style={styles.ctaText}>
        <Text style={styles.ctaTitle}>School announcements</Text>
        <Text style={styles.ctaSubtitle}>News and reminders from your school</Text>
      </View>
      <Ionicons name="chevron-forward" size={22} color={colors.primaryContrast} />
    </TouchableOpacity>
  );
}

export function MessageTeacherButton({ onPress, loading }: { onPress: () => void; loading: boolean }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <TouchableOpacity style={styles.message} onPress={onPress} disabled={loading} activeOpacity={0.75}>
      <View style={styles.messageIcon}>
        {loading ? (
          <ActivityIndicator size="small" color={colors.accentPurple} />
        ) : (
          <Ionicons name="chatbubble-ellipses" size={22} color={colors.accentPurple} />
        )}
      </View>
      <Text style={styles.messageText}>Message teacher</Text>
    </TouchableOpacity>
  );
}

const createStyles = ({ colors }: Theme) =>
  StyleSheet.create({
    cta: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.ctaPurple,
      borderRadius: 20,
      padding: 18,
      gap: 14,
      marginHorizontal: 16,
      marginTop: 16,
    },
    ctaIcon: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: colors.primaryContrast,
      alignItems: 'center',
      justifyContent: 'center',
    },
    ctaText: { flex: 1 },
    ctaTitle: { fontSize: 17, color: colors.primaryContrast, fontFamily: font.bold },
    ctaSubtitle: { fontSize: 13, color: colors.primaryContrast, opacity: 0.88, marginTop: 4, fontFamily: font.medium },
    message: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginHorizontal: 20,
      marginTop: 20,
      paddingVertical: 16,
      paddingHorizontal: 20,
      backgroundColor: colors.card,
      borderRadius: 18,
      gap: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    messageIcon: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.accentPurpleSoft,
    },
    messageText: { fontSize: 16, color: colors.text, fontFamily: font.medium },
  });
