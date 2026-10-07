import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../context/ThemeContext';
import { useThemedStyles, type Theme } from '../../../hooks/useThemedStyles';
import { font } from '../../../theme/typography';
import { softShadow } from '../calendar/calendarStyles';
import type { Rsvp } from './eventDetail';

type Props = {
  mine: Rsvp | undefined;
  pending: Rsvp | null;
  editing: boolean;
  onRespond: (response: Rsvp) => void;
  onEdit: () => void;
};

export function RsvpBar({ mine, pending, editing, onRespond, onEdit }: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const shown = pending ?? mine;
  const picking = shown == null || editing;
  const going = shown === 'accepted';
  const notGoing = shown === 'declined';
  const dimmed = (r: Rsvp) => pending != null && pending !== r && styles.disabled;

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <View style={styles.accent} />
      <Text style={[styles.summary, !picking && { color: colors.textMuted }]}>
        {picking ? (editing ? 'Choose a new response' : 'Will your child attend?') : `You're ${going ? 'going' : 'not going'}.`}
      </Text>
      <View style={styles.actions}>
        {picking || going ? (
          <TouchableOpacity
            style={[styles.primary, going && styles.primarySelected, dimmed('accepted')]}
            onPress={picking ? () => onRespond('accepted') : undefined}
            disabled={!picking || pending != null}
            activeOpacity={picking ? 0.85 : 1}
          >
            {pending === 'accepted' ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name={going ? 'checkmark-circle' : 'checkmark-circle-outline'} size={20} color="#fff" style={styles.icon} />
                <Text style={styles.primaryText}>{going ? 'Going' : "We're going"}</Text>
              </>
            )}
          </TouchableOpacity>
        ) : null}
        {picking || notGoing ? (
          <TouchableOpacity
            style={[styles.secondary, notGoing && styles.secondarySelected, dimmed('declined')]}
            onPress={picking ? () => onRespond('declined') : undefined}
            disabled={!picking || pending != null}
            activeOpacity={picking ? 0.85 : 1}
          >
            {pending === 'declined' ? (
              <ActivityIndicator color={colors.danger} />
            ) : (
              <>
                <Ionicons
                  name={notGoing ? 'close-circle' : 'close-circle-outline'}
                  size={20}
                  color={notGoing ? colors.danger : colors.textMuted}
                  style={styles.icon}
                />
                <Text style={[styles.secondaryText, notGoing && { color: colors.danger }]}>{notGoing ? "Can't go" : "Can't make it"}</Text>
              </>
            )}
          </TouchableOpacity>
        ) : null}
      </View>
      {!picking && pending == null ? (
        <TouchableOpacity onPress={onEdit} style={styles.changeLink} accessibilityRole="button" accessibilityLabel="Change RSVP response">
          <Text style={styles.changeLinkText}>Change response</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

export function PastRsvpCard({ mine }: { mine: Rsvp | undefined }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const text = mine === 'accepted' ? 'You were marked as going' : mine === 'declined' ? 'You were marked as not going' : 'No reply was saved';
  return (
    <View style={styles.pastCard}>
      <View style={styles.pastHeader}>
        <Ionicons name="checkmark-done-outline" size={20} color={colors.textMuted} />
        <Text style={styles.pastLabel}>Your RSVP</Text>
      </View>
      <Text style={styles.pastValue}>{text}</Text>
    </View>
  );
}

const createStyles = ({ colors, isDark }: Theme) =>
  StyleSheet.create({
    bar: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      borderTopWidth: 1,
      paddingHorizontal: 16,
      paddingTop: 14,
      borderTopColor: colors.cardBorder,
      backgroundColor: colors.card,
      ...softShadow(isDark, { shadowColor: '#0f172a', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.08, shadowRadius: 10 }, 10),
    },
    accent: { height: 3, width: 40, borderRadius: 2, alignSelf: 'center', marginBottom: 10, opacity: 0.35, backgroundColor: colors.primary },
    summary: { fontSize: 13, textAlign: 'center', marginBottom: 12, fontFamily: font.regular, color: colors.text },
    actions: { flexDirection: 'row', gap: 10 },
    primary: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
      borderRadius: 14,
      backgroundColor: colors.success,
    },
    primarySelected: { borderWidth: 2, borderColor: 'rgba(255,255,255,0.85)' },
    primaryText: { color: '#FFFFFF', fontFamily: font.semiBold, fontSize: 15 },
    secondary: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      backgroundColor: colors.backgroundSecondary,
    },
    secondarySelected: { borderColor: colors.danger, backgroundColor: colors.dangerMuted },
    secondaryText: { fontFamily: font.semiBold, fontSize: 15, color: colors.text },
    icon: { marginRight: 6 },
    changeLink: { alignSelf: 'center', marginTop: 10, paddingVertical: 4, paddingHorizontal: 8 },
    changeLinkText: { fontSize: 13, fontFamily: font.medium, color: colors.primary },
    disabled: { opacity: 0.55 },
    pastCard: { marginTop: 8, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: colors.cardBorder, backgroundColor: colors.card },
    pastHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    pastLabel: { fontSize: 12, fontFamily: font.semiBold, textTransform: 'uppercase', color: colors.textMuted },
    pastValue: { fontSize: 16, lineHeight: 22, fontFamily: font.semiBold, color: colors.text },
  });
