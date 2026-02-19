import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export function MessagesPlaceholderScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Messages</Text>
      <Text style={styles.subtitle}>Communicate with parents</Text>
      <Text style={styles.placeholder}>Messaging will be available in a future update.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f8fafc', justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '700', color: '#1e293b' },
  subtitle: { fontSize: 14, color: '#64748b', marginTop: 4 },
  placeholder: { fontSize: 14, color: '#94a3b8', marginTop: 24, textAlign: 'center' },
});
