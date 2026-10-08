import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { brandFont } from '../../theme/typography';

export function ChatEmpty({ loading }: { loading: boolean }) {
  const { brand, category } = useTheme();
  if (loading) {
    return (
      <View style={styles.wrap}>
        <ActivityIndicator size="large" color={brand.textPrimary} />
      </View>
    );
  }
  return (
    <View style={styles.wrap}>
      <View style={[styles.icon, { backgroundColor: category.nap }]}>
        <Ionicons name="chatbubbles-outline" size={36} color={category.onCategory} />
      </View>
      <Text style={[styles.title, { color: brand.textPrimary }]}>No messages yet</Text>
      <Text style={[styles.subtitle, { color: brand.textTertiary }]}>Say hello to start the conversation.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignSelf: 'center', alignItems: 'center', paddingHorizontal: 32, paddingVertical: 48 },
  icon: { width: 72, height: 72, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  title: { fontFamily: brandFont.display800, fontSize: 19, marginBottom: 6, textAlign: 'center' },
  subtitle: { fontFamily: brandFont.body400, fontSize: 15, lineHeight: 21, textAlign: 'center' },
});
