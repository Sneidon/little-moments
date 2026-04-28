import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';
import { collection, getDocs } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';

import app, { db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { font } from '../../theme/typography';
import type { ClassRoom } from '../../../../shared/types';

export function ParentAddSiblingScreen({ navigation }: { navigation: { goBack: () => void } }) {
  const { profile } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ firstName: '', surname: '', dob: '', classId: '', popiaConsent: false });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const schoolId = profile?.schoolId;
    if (!schoolId) {
      setLoading(false);
      return;
    }
    getDocs(collection(db, 'schools', schoolId, 'classes'))
      .then((snap) => setClasses(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as ClassRoom))))
      .finally(() => setLoading(false));
  }, [profile?.schoolId]);

  const submit = async () => {
    if (!form.firstName.trim() || !form.surname.trim() || !form.dob || !form.classId) {
      Alert.alert('Missing details', 'Please complete all fields.');
      return;
    }
    if (!form.popiaConsent) {
      Alert.alert('Consent required', 'POPIA consent is required.');
      return;
    }
    setSubmitting(true);
    try {
      const fn = httpsCallable<
        { childFirstName: string; childSurname: string; dob: string; classId: string; popiaConsent: boolean },
        { ok: boolean }
      >(getFunctions(app), 'addSiblingChild');
      await fn({
        childFirstName: form.firstName.trim(),
        childSurname: form.surname.trim(),
        dob: form.dob,
        classId: form.classId,
        popiaConsent: true,
      });
      Alert.alert('Submitted', 'Your request was sent to the class teacher for approval.', [
        { text: 'Done', onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Add another child</Text>
      <Text style={styles.subtitle}>Enter your child’s details. The teacher will approve access.</Text>

      <View style={styles.card}>
        <Text style={styles.label}>First name</Text>
        <TextInput style={styles.input} value={form.firstName} onChangeText={(t) => setForm((f) => ({ ...f, firstName: t }))} />
        <Text style={styles.label}>Surname</Text>
        <TextInput style={styles.input} value={form.surname} onChangeText={(t) => setForm((f) => ({ ...f, surname: t }))} />
        <Text style={styles.label}>Date of birth</Text>
        <TextInput style={styles.input} value={form.dob} onChangeText={(t) => setForm((f) => ({ ...f, dob: t }))} placeholder="YYYY-MM-DD" />
        <Text style={styles.label}>Class</Text>
        <TextInput
          style={styles.input}
          value={form.classId}
          onChangeText={(t) => setForm((f) => ({ ...f, classId: t }))}
          placeholder={loading ? 'Loading classes… (enter classId)' : 'Enter classId (or pick from list in future)'}
        />
        <Text style={styles.help}>
          For now this expects a class ID. If you prefer, we can swap this for a dropdown (same as the join web flow).
        </Text>

        <TouchableOpacity
          style={styles.checkboxRow}
          onPress={() => setForm((f) => ({ ...f, popiaConsent: !f.popiaConsent }))}
          activeOpacity={0.8}
        >
          <View style={[styles.checkbox, form.popiaConsent && { backgroundColor: colors.primary, borderColor: colors.primary }]} />
          <Text style={styles.checkboxText}>I consent to POPIA data processing</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.primaryBtn} onPress={submit} disabled={submitting} activeOpacity={0.85}>
          <Text style={styles.primaryBtnText}>{submitting ? 'Submitting…' : 'Submit'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function createStyles(colors: import('../../theme/colors').ColorPalette) {
  const f = (w: 'regular' | 'medium' | 'semiBold' | 'bold') => ({ fontFamily: font[w] });
  return StyleSheet.create({
    container: { flex: 1, padding: 16, backgroundColor: colors.backgroundSecondary },
    title: { fontSize: 20, color: colors.text, ...f('bold') },
    subtitle: { marginTop: 6, fontSize: 13, color: colors.textMuted, ...f('medium') },
    card: {
      marginTop: 14,
      backgroundColor: colors.card,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      padding: 14,
    },
    label: { marginTop: 10, fontSize: 12, color: colors.textMuted, ...f('semiBold') },
    input: {
      marginTop: 6,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 12,
      paddingHorizontal: 10,
      paddingVertical: 10,
      color: colors.text,
      ...f('regular'),
    },
    help: { marginTop: 8, fontSize: 12, color: colors.textMuted, ...f('regular') },
    checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14 },
    checkbox: { width: 18, height: 18, borderRadius: 5, borderWidth: 1, borderColor: colors.cardBorder, backgroundColor: 'transparent' },
    checkboxText: { fontSize: 13, color: colors.textSecondary, ...f('medium') },
    primaryBtn: { marginTop: 16, backgroundColor: colors.primary, paddingVertical: 12, borderRadius: 14, alignItems: 'center' },
    primaryBtnText: { color: '#FFFFFF', fontSize: 14, ...f('bold') },
  });
}

