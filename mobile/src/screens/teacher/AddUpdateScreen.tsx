import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { collection, addDoc, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import type { Child } from '../../../../shared/types';
import type { ClassRoom } from '../../../../shared/types';
import type { ReportType } from '../../../../shared/types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type TeacherStackParamList = {
  TeacherHome: undefined;
  Reports: { childId: string };
  AddUpdate: undefined;
  Announcements: undefined;
  Events: undefined;
  Settings: undefined;
};
type Props = NativeStackScreenProps<TeacherStackParamList, 'AddUpdate'>;

const REPORT_TYPES: ReportType[] = ['nappy_change', 'meal', 'nap_time', 'medication', 'incident'];
const MEAL_TYPES = ['breakfast', 'lunch', 'snack'] as const;

export function AddUpdateScreen({ navigation }: Props) {
  const { profile } = useAuth();
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [type, setType] = useState<ReportType>('meal');
  const [mealType, setMealType] = useState<'breakfast' | 'lunch' | 'snack'>('lunch');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  // Children are assigned by classId; teacher is assigned to class(es) via assignedTeacherId on the class
  useEffect(() => {
    const schoolId = profile?.schoolId;
    const uid = profile?.uid;
    if (!schoolId || !uid) return;

    let cancelled = false;
    let unsub: (() => void) | null = null;

    (async () => {
      const classesSnap = await getDocs(collection(db, 'schools', schoolId, 'classes'));
      if (cancelled) return;
      const myClasses = classesSnap.docs.filter(
        (d) => (d.data() as ClassRoom).assignedTeacherId === uid
      );
      const classIds = myClasses.map((d) => d.id).slice(0, 10);

      if (classIds.length === 0) {
        setChildren([]);
        return;
      }

      unsub = onSnapshot(
        query(
          collection(db, 'schools', schoolId, 'children'),
          where('classId', 'in', classIds)
        ),
        (snap) => {
          if (cancelled) return;
          setChildren(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Child)));
        }
      );
    })();

    return () => {
      cancelled = true;
      if (unsub) unsub();
    };
  }, [profile?.schoolId, profile?.uid]);

  const selectedChild = children.find((c) => c.id === selectedChildId);

  const submit = async () => {
    const schoolId = profile?.schoolId;
    if (!schoolId || !selectedChildId) {
      Alert.alert('Select a child', 'Choose a child first.');
      return;
    }
    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        childId: selectedChildId,
        schoolId,
        type,
        reportedBy: profile!.uid,
        notes: notes.trim() || undefined,
        timestamp: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };
      if (type === 'meal') payload.mealType = mealType;
      await addDoc(
        collection(db, 'schools', schoolId, 'children', selectedChildId, 'reports'),
        payload
      );
      Alert.alert('Done', 'Update saved.');
      setNotes('');
      navigation.goBack();
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.sectionTitle}>Select child</Text>
      <View style={styles.childList}>
        {children.map((c) => (
          <TouchableOpacity
            key={c.id}
            style={[styles.childChip, selectedChildId === c.id && styles.childChipActive]}
            onPress={() => setSelectedChildId(c.id)}
          >
            <Text style={[styles.childChipText, selectedChildId === c.id && styles.childChipTextActive]}>
              {c.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {children.length === 0 && <Text style={styles.hint}>No children assigned to your class.</Text>}

      {selectedChild && (
        <>
          <Text style={styles.sectionTitle}>Update type</Text>
          <View style={styles.typeRow}>
            {REPORT_TYPES.map((t) => (
              <TouchableOpacity
                key={t}
                style={[styles.typeBtn, type === t && styles.typeBtnActive]}
                onPress={() => setType(t)}
              >
                <Text style={[styles.typeText, type === t && styles.typeTextActive]}>
                  {t.replace('_', ' ')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {type === 'meal' && (
            <View style={styles.mealRow}>
              <Text style={styles.label}>Meal</Text>
              {MEAL_TYPES.map((m) => (
                <TouchableOpacity
                  key={m}
                  style={[styles.mealBtn, mealType === m && styles.typeBtnActive]}
                  onPress={() => setMealType(m)}
                >
                  <Text style={[styles.typeText, mealType === m && styles.typeTextActive]}>{m}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <Text style={styles.label}>Notes (optional)</Text>
          <TextInput
            style={styles.input}
            value={notes}
            onChangeText={setNotes}
            placeholder="e.g. Ate well, napped 1hr..."
            multiline
            numberOfLines={3}
            editable={!loading}
          />
          <TouchableOpacity style={styles.button} onPress={submit} disabled={loading}>
            <Text style={styles.buttonText}>{loading ? 'Saving…' : 'Save update'}</Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f8fafc' },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: '#475569', marginBottom: 8 },
  childList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  childChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  childChipActive: { borderColor: '#6366f1', backgroundColor: '#eef2ff' },
  childChipText: { fontSize: 14, color: '#64748b' },
  childChipTextActive: { color: '#6366f1', fontWeight: '600' },
  hint: { fontSize: 13, color: '#64748b', marginBottom: 16 },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  typeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  typeBtnActive: { borderColor: '#6366f1', backgroundColor: '#eef2ff' },
  typeText: { fontSize: 12, color: '#64748b' },
  typeTextActive: { color: '#6366f1', fontWeight: '600' },
  mealRow: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: '#475569', marginBottom: 8 },
  mealBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignSelf: 'flex-start',
    marginRight: 8,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    minHeight: 80,
    backgroundColor: '#fff',
    marginBottom: 16,
  },
  button: { backgroundColor: '#6366f1', padding: 14, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '600' },
});
