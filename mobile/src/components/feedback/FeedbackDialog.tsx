import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PrimaryButton } from '../brand/Buttons';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles, type Theme } from '../../hooks/useThemedStyles';
import { brandFont } from '../../theme/typography';
import { radius, type as typeTokens } from '../../theme/tokens';

export type FeedbackTone = 'success' | 'error' | 'warning';

type Props = { tone: FeedbackTone; title: string; message?: string; actionLabel: string; onClose: () => void };

const ICONS: Record<FeedbackTone, React.ComponentProps<typeof Ionicons>['name']> = {
  success: 'checkmark',
  error: 'close',
  warning: 'alert',
};

export function FeedbackDialog({ tone, title, message, actionLabel, onClose }: Props) {
  const { category } = useTheme();
  const styles = useThemedStyles(createStyles);
  const tile = { success: category.attendance, error: category.photo, warning: category.activity }[tone];
  return (
    <View style={styles.card} accessibilityViewIsModal accessibilityRole="alert">
      <View style={[styles.tile, { backgroundColor: tile }]}>
        <Ionicons name={ICONS[tone]} size={34} color={category.onCategory} />
      </View>
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
      <PrimaryButton label={actionLabel} size="s" style={styles.button} onPress={onClose} />
    </View>
  );
}

const createStyles = ({ brand }: Theme) =>
  StyleSheet.create({
    card: {
      width: '100%',
      maxWidth: 400,
      alignItems: 'center',
      padding: 24,
      borderRadius: radius.cardL,
      backgroundColor: brand.surface,
      shadowColor: brand.shadow,
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.25,
      shadowRadius: 24,
      elevation: 12,
    },
    tile: { width: 64, height: 64, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
    title: { ...typeTokens.cardTitle, color: brand.textPrimary, textAlign: 'center' },
    message: { fontFamily: brandFont.body500, fontSize: 15, lineHeight: 21, color: brand.textSecondary, textAlign: 'center', marginTop: 8 },
    button: { alignSelf: 'stretch', marginTop: 22 },
  });
