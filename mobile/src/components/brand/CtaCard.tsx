import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles, type Theme } from '../../hooks/useThemedStyles';
import { brandFont } from '../../theme/typography';
import { radius, type as typeTokens } from '../../theme/tokens';

type Props = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  subtitle: string;
  onPress: () => void;
};

/** The sunflower call-to-action card that overlaps the bottom of a dashboard header. */
export function CtaCard({ icon, title, subtitle, onPress }: Props) {
  const { category } = useTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <TouchableOpacity style={styles.cta} onPress={onPress} activeOpacity={0.9} accessibilityRole="button" accessibilityLabel={`${title}. ${subtitle}`}>
      <View style={styles.icon}>
        <Ionicons name={icon} size={28} color={category.activity} />
      </View>
      <View style={styles.text}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={22} color={category.onCategory} />
    </TouchableOpacity>
  );
}

const createStyles = ({ brand, category, isDark }: Theme) =>
  StyleSheet.create({
    cta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      paddingVertical: 16,
      paddingLeft: 16,
      paddingRight: 18,
      borderRadius: radius.cardL,
      borderWidth: 3,
      borderColor: brand.background,
      backgroundColor: category.activity,
      shadowColor: brand.shadow,
      shadowOffset: { width: 0, height: 14 },
      shadowOpacity: isDark ? 0.7 : 0.45,
      shadowRadius: 14,
      elevation: 8,
    },
    icon: { width: 52, height: 52, borderRadius: 26, backgroundColor: category.onCategory, alignItems: 'center', justifyContent: 'center' },
    text: { flex: 1, minWidth: 0, gap: 2 },
    title: { ...typeTokens.cardTitle, color: category.onCategory },
    subtitle: { fontFamily: brandFont.body600, fontSize: 14, color: '#4A3D00' },
  });
