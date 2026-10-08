import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { collection, getDocs } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';

import app, { db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { font } from '../../theme/typography';
import type { ClassRoom } from '@shared/types';
import { useFeedback } from '../../context/FeedbackContext';

export function ParentAddSiblingScreen({ navigation }: { navigation: { goBack: () => void } }) {
  const { notify, withLoader } = useFeedback();
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
      .then((snap) => setClasses(snap.docs.map((d) => ({ ...(d.data() as ClassRoom), id: d.id }))))
      .finally(() => setLoading(false));
  }, [profile?.schoolId]);

  const submit = async () => {
    if (!form.firstName.trim() || !form.surname.trim() || !form.dob || !form.classId) {
      void notify({ tone: 'warning', title: 'Missing details', message: 'Please complete all fields.' });
      return;
    }
    if (!form.popiaConsent) {
      void notify({ tone: 'warning', title: 'Consent required', message: 'POPIA consent is required.' });
      return;
    }
    setSubmitting(true);
    try {
      await withLoader(async () => {
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
      }, 'Submitting…');
      await notify({ tone: 'success', title: 'Submitted', message: 'Your request was sent to the class teacher for approval.', actionLabel: 'Done' });
      navigation.goBack();
    } catch (e) {
      void notify({ tone: 'error', title: 'Error', message: e instanceof Error ? e.message : 'Failed to submit' });
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
        <View style={styles.chips}>
          {loading ? <Text style={styles.help}>Loading classes…</Text> : null}
          {!loading && classes.length === 0 ? <Text style={styles.help}>No classes found for your school.</Text> : null}
          {classes.map((c) => {
            const selected = form.classId === c.id;
            return (
              <TouchableOpacity
                key={c.id}
                style={[styles.chip, selected && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                onPress={() => setForm((f) => ({ ...f, classId: c.id }))}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
              >
                <Text style={[styles.chipText, selected && { color: colors.primaryContrast }]}>{c.name}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

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
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
    chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: colors.cardBorder },
    chipText: { fontSize: 13, color: colors.text, ...f('semiBold') },
    help: { marginTop: 8, fontSize: 12, color: colors.textMuted, ...f('regular') },
    checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14 },
    checkbox: { width: 18, height: 18, borderRadius: 5, borderWidth: 1, borderColor: colors.cardBorder, backgroundColor: 'transparent' },
    checkboxText: { fontSize: 13, color: colors.textSecondary, ...f('medium') },
    primaryBtn: { marginTop: 16, backgroundColor: colors.primary, paddingVertical: 12, borderRadius: 14, alignItems: 'center' },
    primaryBtnText: { color: colors.primaryContrast, fontSize: 14, ...f('bold') },
  });
}

