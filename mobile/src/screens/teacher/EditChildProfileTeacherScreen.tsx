import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { getFunctions, httpsCallable } from 'firebase/functions';
import firebaseApp from '../../config/firebase';
import { useTheme } from '../../context/ThemeContext';
import type { Child } from '../../../../shared/types';

export function EditChildProfileTeacherScreen({
  child,
  schoolId,
  onSaved,
  onCancel,
}: {
  child: Child;
  schoolId: string;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [name, setName] = useState(child.name ?? '');
  const [dateOfBirth, setDateOfBirth] = useState(child.dateOfBirth?.slice(0, 10) ?? '');
  const [allergiesText, setAllergiesText] = useState(
    (child.allergies ?? []).join(', ')
  );
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Name is required.');
      return;
    }
    if (!dateOfBirth.trim()) {
      Alert.alert('Required', 'Date of birth is required.');
      return;
    }
    setSaving(true);
    try {
      const updateChild = httpsCallable<
        { schoolId: string; childId: string; name?: string; dateOfBirth?: string; allergies?: string[] },
        { ok: boolean }
      >(getFunctions(firebaseApp), 'updateChildProfileByTeacher');
      const allergies = allergiesText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      await updateChild({
        schoolId,
        childId: child.id,
        name: name.trim(),
        dateOfBirth: dateOfBirth.trim(),
        allergies: allergies.length > 0 ? allergies : undefined,
      });
      onSaved();
    } catch {
      Alert.alert('Error', 'Could not save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.label}>Name</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Child's name" placeholderTextColor={colors.textMuted} editable={!saving} />
        <Text style={styles.label}>Date of birth</Text>
        <TextInput style={styles.input} value={dateOfBirth} onChangeText={setDateOfBirth} placeholder="YYYY-MM-DD" placeholderTextColor={colors.textMuted} editable={!saving} />
        <Text style={styles.label}>Allergies (comma-separated)</Text>
        <TextInput style={[styles.input, styles.inputMultiline]} value={allergiesText} onChangeText={setAllergiesText} placeholder="e.g. Nuts, Dairy" placeholderTextColor={colors.textMuted} multiline editable={!saving} />
      </View>
      <View style={styles.actions}>
        <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} disabled={saving}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.saveBtn, saving && styles.saveBtnDisabled]} onPress={save} disabled={saving}>
          {saving ? <ActivityIndicator size="small" color={colors.primaryContrast} /> : <Text style={styles.saveText}>Save</Text>}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function createStyles(colors: import('../../theme/colors').ColorPalette) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: 16, paddingBottom: 32 },
    card: { backgroundColor: colors.card, borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: colors.cardBorder },
    label: { fontSize: 14, fontWeight: '600', color: colors.textSecondary, marginBottom: 6, marginTop: 12 },
    input: { borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 8, padding: 12, fontSize: 15, color: colors.text },
    inputMultiline: { minHeight: 60 },
    actions: { flexDirection: 'row', gap: 12, justifyContent: 'flex-end' },
    cancelBtn: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8, borderWidth: 1, borderColor: colors.cardBorder },
    cancelText: { fontSize: 15, color: colors.text },
    saveBtn: { paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8, backgroundColor: colors.primary },
    saveBtnDisabled: { opacity: 0.6 },
    saveText: { fontSize: 15, fontWeight: '600', color: colors.primaryContrast },
  });
}
