import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { signOut } from 'firebase/auth';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import type { Child } from '../../../../shared/types';
import type { ClassRoom } from '../../../../shared/types';
import type { School } from '../../../../shared/types';

function getAge(dateOfBirth: string): string {
  const dob = new Date(dateOfBirth);
  const now = new Date();
  const months = (now.getFullYear() - dob.getFullYear()) * 12 + (now.getMonth() - dob.getMonth());
  if (months < 12) return `${months} mo`;
  const years = Math.floor(months / 12);
  return years === 1 ? '1 year' : `${years} years`;
}

export function ParentSettingsScreen() {
  const { profile, selectedChildId } = useAuth();
  const [children, setChildren] = useState<Child[]>([]);
  const [school, setSchool] = useState<School | null>(null);
  const [classNames, setClassNames] = useState<Record<string, string>>({});

  useEffect(() => {
    const uid = profile?.uid;
    if (!uid) return;
    (async () => {
      const schoolsSnap = await getDocs(collection(db, 'schools'));
      const list: Child[] = [];
      for (const schoolDoc of schoolsSnap.docs) {
        const q = query(
          collection(db, 'schools', schoolDoc.id, 'children'),
          where('parentIds', 'array-contains', uid)
        );
        const snap = await getDocs(q);
        snap.docs.forEach((d) => list.push({ id: d.id, ...d.data() } as Child));
      }
      setChildren(list);
      const firstSchoolId = list[0]?.schoolId;
      if (firstSchoolId) {
        const schoolSnap = await getDoc(doc(db, 'schools', firstSchoolId));
        if (schoolSnap.exists()) setSchool({ id: schoolSnap.id, ...schoolSnap.data() } as School);
      }
    })();
  }, [profile?.uid]);

  useEffect(() => {
    const schoolIds = [...new Set(children.map((c) => c.schoolId))];
    if (schoolIds.length === 0) return;
    (async () => {
      const names: Record<string, string> = {};
      for (const sid of schoolIds) {
        const classesSnap = await getDocs(collection(db, 'schools', sid, 'classes'));
        classesSnap.docs.forEach((d) => {
          const c = d.data() as ClassRoom;
          names[c.id] = c.name;
        });
      }
      setClassNames(names);
    })();
  }, [children]);

  const selectedChild = selectedChildId
    ? children.find((c) => c.id === selectedChildId)
    : children[0];
  const className = selectedChild?.classId ? classNames[selectedChild.classId] ?? selectedChild.classId : null;

  const handleSignOut = () => {
    signOut(auth);
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Settings</Text>
      <Text style={styles.subtitle}>Manage your account and preferences</Text>

      {selectedChild && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Child profile</Text>
          <Text style={styles.childName}>{selectedChild.name}</Text>
          <Text style={styles.row}>
            {getAge(selectedChild.dateOfBirth)} old
            {className ? ` · ${className}` : ''}
          </Text>
          {selectedChild.allergies?.length ? (
            <View style={styles.allergyRow}>
              <Text style={styles.label}>Allergies</Text>
              <View style={styles.tagRow}>
                {selectedChild.allergies.map((a) => (
                  <View key={a} style={styles.tag}>
                    <Text style={styles.tagText}>{a}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}
          {selectedChild.emergencyContact ? (
            <Text style={[styles.row, styles.emergency]}>Emergency: {selectedChild.emergencyContact}</Text>
          ) : null}
        </View>
      )}

      {school && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Daycare information</Text>
          <Text style={styles.row}>{school.name}</Text>
          {school.contactPhone ? <Text style={styles.row}>{school.contactPhone}</Text> : null}
          {school.contactEmail ? <Text style={styles.row}>{school.contactEmail}</Text> : null}
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Account</Text>
        <Text style={styles.signOutHint}>Sign out to switch account.</Text>
        <Text style={styles.signOutLink} onPress={handleSignOut}>Sign out</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f8fafc' },
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
  cardTitle: { fontSize: 14, fontWeight: '600', color: '#475569', marginBottom: 12 },
  childName: { fontSize: 18, fontWeight: '600', color: '#1e293b' },
  row: { fontSize: 14, color: '#64748b', marginTop: 4 },
  label: { fontSize: 12, fontWeight: '600', color: '#475569', marginTop: 12, marginBottom: 4 },
  allergyRow: {},
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  tag: { backgroundColor: '#fef2f2', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  tagText: { fontSize: 12, color: '#dc2626', fontWeight: '500' },
  emergency: { marginTop: 8 },
  signOutHint: { fontSize: 13, color: '#64748b', marginBottom: 12 },
  signOutLink: { fontSize: 14, color: '#dc2626', fontWeight: '600' },
});
