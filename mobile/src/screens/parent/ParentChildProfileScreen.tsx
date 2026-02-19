import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { collection, query, orderBy, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import type { DailyReport } from '../../../../shared/types';
import type { Child } from '../../../../shared/types';
import type { ClassRoom } from '../../../../shared/types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type ParentStackParamList = {
  ParentHome: undefined;
  ChildProfile: { childId: string; schoolId: string };
  Announcements: undefined;
  Events: undefined;
};
type Props = NativeStackScreenProps<ParentStackParamList, 'ChildProfile'>;

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function getAge(dateOfBirth: string): string {
  const dob = new Date(dateOfBirth);
  const now = new Date();
  const months = (now.getFullYear() - dob.getFullYear()) * 12 + (now.getMonth() - dob.getMonth());
  if (months < 12) return `${months} mo`;
  const years = Math.floor(months / 12);
  return years === 1 ? '1 year' : `${years} years`;
}

export function ParentChildProfileScreen({ route }: Props) {
  const { childId, schoolId } = route.params;
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [child, setChild] = useState<Child | null>(null);
  const [className, setClassName] = useState<string | null>(null);

  useEffect(() => {
    const q = query(
      collection(db, 'schools', schoolId, 'children', childId, 'reports'),
      orderBy('timestamp', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setReports(snap.docs.map((d) => ({ id: d.id, ...d.data() } as DailyReport)));
    });
    return () => unsub();
  }, [schoolId, childId]);

  useEffect(() => {
    (async () => {
      const childSnap = await getDoc(doc(db, 'schools', schoolId, 'children', childId));
      if (childSnap.exists()) setChild({ id: childSnap.id, ...childSnap.data() } as Child);
      const childData = childSnap.data() as Child | undefined;
      if (childData?.classId) {
        const classSnap = await getDoc(doc(db, 'schools', schoolId, 'classes', childData.classId));
        if (classSnap.exists()) setClassName((classSnap.data() as ClassRoom).name);
      }
    })();
  }, [schoolId, childId]);

  const renderReport = ({ item }: { item: DailyReport }) => (
    <View style={styles.card}>
      <Text style={styles.type}>{item.type.replace('_', ' ')}</Text>
      <Text style={styles.time}>{formatTime(item.timestamp)}</Text>
      {item.notes ? <Text style={styles.notes}>{item.notes}</Text> : null}
    </View>
  );

  return (
    <View style={styles.container}>
      {child && (
        <View style={styles.profileCard}>
          <Text style={styles.childName}>{child.name}</Text>
          <Text style={styles.meta}>
            {getAge(child.dateOfBirth)}
            {className ? ` · ${className}` : ''}
          </Text>
          {child.allergies?.length ? (
            <Text style={styles.allergies}>Allergies: {child.allergies.join(', ')}</Text>
          ) : null}
          {child.emergencyContact ? (
            <Text style={styles.emergency}>Emergency: {child.emergencyContact}</Text>
          ) : null}
        </View>
      )}
      <Text style={styles.sectionTitle}>Daily reports</Text>
      <FlatList
        data={reports}
        keyExtractor={(item) => item.id}
        renderItem={renderReport}
        ListEmptyComponent={<Text style={styles.empty}>No reports yet.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f8fafc' },
  profileCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  childName: { fontSize: 18, fontWeight: '600', color: '#1e293b' },
  meta: { fontSize: 14, color: '#64748b', marginTop: 4 },
  allergies: { fontSize: 13, color: '#dc2626', marginTop: 8 },
  emergency: { fontSize: 13, color: '#475569', marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#475569', marginBottom: 12 },
  card: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  type: { fontSize: 14, fontWeight: '600', color: '#6366f1' },
  time: { fontSize: 12, color: '#64748b', marginTop: 4 },
  notes: { fontSize: 14, color: '#475569', marginTop: 8 },
  empty: { color: '#64748b', textAlign: 'center', marginTop: 24 },
});
