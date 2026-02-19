import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export function PhotosPlaceholderScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Photos</Text>
      <Text style={styles.subtitle}>Daily moments</Text>
      <Text style={styles.placeholder}>Photo sharing will be available in a future update.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f8fafc', justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '700', color: '#1e293b' },
  subtitle: { fontSize: 14, color: '#64748b', marginTop: 4 },
  placeholder: { fontSize: 14, color: '#94a3b8', marginTop: 24, textAlign: 'center' },
});
