import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { signOut } from 'firebase/auth';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { auth, db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import type { ClassRoom } from '../../../../shared/types';

export function TeacherSettingsScreen() {
  const { profile } = useAuth();
  const [className, setClassName] = useState<string | null>(null);

  useEffect(() => {
    const schoolId = profile?.schoolId;
    const uid = profile?.uid;
    if (!schoolId || !uid) return;
    (async () => {
      const snap = await getDocs(collection(db, 'schools', schoolId, 'classes'));
      const myClass = snap.docs.find(
        (d) => (d.data() as ClassRoom).assignedTeacherId === uid
      );
      setClassName(myClass ? (myClass.data() as ClassRoom).name : null);
    })();
  }, [profile?.schoolId, profile?.uid]);

  const handleSignOut = () => {
    signOut(auth);
  };

  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        <Ionicons name="settings-outline" size={24} color="#1e293b" />
        <Text style={styles.title}>Settings</Text>
      </View>
      <Text style={styles.subtitle}>Manage your account</Text>

      <View style={styles.card}>
        <View style={styles.cardTitleRow}>
          <Ionicons name="person-outline" size={18} color="#475569" />
          <Text style={styles.cardTitle}>Profile</Text>
        </View>
        <Text style={styles.row}>{profile?.displayName ?? '—'}</Text>
        <Text style={styles.row}>{profile?.email}</Text>
        {className ? (
          <Text style={[styles.row, styles.room]}>Class: {className}</Text>
        ) : null}
      </View>

      <View style={styles.card}>
        <View style={styles.cardTitleRow}>
          <Ionicons name="log-out-outline" size={18} color="#475569" />
          <Text style={styles.cardTitle}>Account</Text>
        </View>
        <Text style={styles.signOutHint}>Sign out to switch account or use the web app as principal.</Text>
        <Text style={styles.signOutLink} onPress={handleSignOut}>
          Sign out
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f8fafc' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { fontSize: 20, fontWeight: '700', color: '#1e293b' },
  subtitle: { fontSize: 14, color: '#64748b', marginTop: 4, marginBottom: 20 },
  card: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  cardTitle: { fontSize: 14, fontWeight: '600', color: '#475569' },
  row: { fontSize: 14, color: '#1e293b', marginBottom: 4 },
  room: { color: '#6366f1', fontWeight: '500' },
  signOutHint: { fontSize: 13, color: '#64748b', marginBottom: 12 },
  signOutLink: { fontSize: 14, color: '#dc2626', fontWeight: '600' },
});
