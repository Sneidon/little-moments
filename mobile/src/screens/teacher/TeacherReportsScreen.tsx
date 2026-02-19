import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import type { ReportType } from '../../../../shared/types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type TeacherStackParamList = { TeacherHome: undefined; Reports: { childId: string }; Announcements: undefined; Events: undefined };
type Props = NativeStackScreenProps<TeacherStackParamList, 'Reports'>;

const REPORT_TYPES: ReportType[] = ['nappy_change', 'meal', 'nap_time', 'medication', 'incident'];
const MEAL_TYPES = ['breakfast', 'lunch', 'snack'] as const;

export function TeacherReportsScreen({ route, navigation }: Props) {
  const { childId } = route.params;
  const { profile } = useAuth();
  const [type, setType] = useState<ReportType>('nappy_change');
  const [mealType, setMealType] = useState<'breakfast' | 'lunch' | 'snack'>('lunch');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  if (!profile?.schoolId) return null;

  const submit = async () => {
    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        childId,
        schoolId: profile.schoolId,
        type,
        reportedBy: profile.uid,
        notes: notes.trim() || undefined,
        timestamp: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };
      if (type === 'meal') payload.mealType = mealType;
      await addDoc(collection(db, 'schools', profile.schoolId, 'children', childId, 'reports'), payload);
      Alert.alert('Done', 'Report saved.');
      navigation.goBack();
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to save report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.labelRow}>
        <Ionicons name="document-text-outline" size={20} color="#475569" />
        <Text style={styles.label}>Report type</Text>
      </View>
      <View style={styles.typeRow}>
        {REPORT_TYPES.map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.typeBtn, type === t && styles.typeBtnActive]}
            onPress={() => setType(t)}
          >
            <Text style={[styles.typeText, type === t && styles.typeTextActive]}>{t.replace('_', ' ')}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {type === 'meal' && (
        <>
          <Text style={styles.label}>Meal</Text>
          <View style={styles.typeRow}>
            {MEAL_TYPES.map((m) => (
              <TouchableOpacity
                key={m}
                style={[styles.typeBtn, mealType === m && styles.typeBtnActive]}
                onPress={() => setMealType(m)}
              >
                <Text style={[styles.typeText, mealType === m && styles.typeTextActive]}>{m}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}
      <View style={styles.labelRow}>
        <Ionicons name="create-outline" size={20} color="#475569" />
        <Text style={styles.label}>Notes (optional)</Text>
      </View>
      <TextInput
        style={styles.input}
        value={notes}
        onChangeText={setNotes}
        placeholder="Add details..."
        multiline
        numberOfLines={3}
        editable={!loading}
      />
      <TouchableOpacity style={styles.button} onPress={submit} disabled={loading}>
        <Ionicons name="checkmark-circle-outline" size={22} color="#fff" style={styles.buttonIcon} />
        <Text style={styles.buttonText}>{loading ? 'Saving…' : 'Save report'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f8fafc' },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  label: { fontSize: 14, fontWeight: '600', color: '#475569', marginBottom: 8 },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  typeBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  typeBtnActive: { borderColor: '#6366f1', backgroundColor: '#eef2ff' },
  typeText: { fontSize: 12, color: '#64748b' },
  typeTextActive: { color: '#6366f1', fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    minHeight: 80,
    backgroundColor: '#fff',
    marginBottom: 16,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366f1',
    padding: 14,
    borderRadius: 8,
  },
  buttonIcon: { marginRight: 8 },
  buttonText: { color: '#fff', fontWeight: '600' },
});
