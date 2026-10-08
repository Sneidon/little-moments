import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { radius, type as typeTokens } from '../../theme/tokens';

type Props = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  body: string;
  style?: StyleProp<ViewStyle>;
};

export function EmptyCard({ icon, title, body, style }: Props) {
  const { brand, category } = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: brand.surface }, style]}>
      <View style={[styles.icon, { backgroundColor: category.nap }]}>
        <Ionicons name={icon} size={28} color={category.onCategory} />
      </View>
      <Text style={[styles.title, { color: brand.textPrimary }]}>{title}</Text>
      <Text style={[styles.body, { color: brand.textSecondary }]}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.card, paddingVertical: 28, paddingHorizontal: 24, alignItems: 'center', gap: 10 },
  icon: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  title: { ...typeTokens.cardTitle, textAlign: 'center' },
  body: { ...typeTokens.body, textAlign: 'center', maxWidth: 280 },
});
