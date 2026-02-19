import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export function PhotosPlaceholderScreen() {
  return (
    <View style={styles.container}>
      <Ionicons name="images-outline" size={64} color="#cbd5e1" style={styles.icon} />
      <Text style={styles.title}>Photos</Text>
      <Text style={styles.subtitle}>Daily moments</Text>
      <Text style={styles.placeholder}>Photo sharing will be available in a future update.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center' },
  icon: { marginBottom: 16 },
  title: { fontSize: 20, fontWeight: '700', color: '#1e293b' },
  subtitle: { fontSize: 14, color: '#64748b', marginTop: 4 },
  placeholder: { fontSize: 14, color: '#94a3b8', marginTop: 24, textAlign: 'center' },
});
