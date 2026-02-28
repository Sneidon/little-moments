import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { signOut } from 'firebase/auth';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { useTheme, type ThemeMode } from '../../context/ThemeContext';
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
  const { colors, themeMode, setThemeMode } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
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

  const cycleTheme = () => {
    const next: ThemeMode = themeMode === 'system' ? 'dark' : themeMode === 'dark' ? 'light' : 'system';
    setThemeMode(next);
  };

  const themeLabel = themeMode === 'system' ? 'System' : themeMode === 'dark' ? 'Dark' : 'Light';

  return (
    <ScrollView style={styles.container}>
      <View style={styles.card}>
        <View style={styles.cardTitleRow}>
          <Ionicons name="moon-outline" size={18} color={colors.textMuted} />
          <Text style={styles.cardTitle}>Appearance</Text>
        </View>
        <TouchableOpacity style={styles.themeRow} onPress={cycleTheme} activeOpacity={0.7}>
          <Text style={styles.themeLabel}>Theme</Text>
          <Text style={styles.themeValue}>{themeLabel}</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      {selectedChild && (
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="person-outline" size={18} color={colors.textMuted} />
            <Text style={styles.cardTitle}>Child profile</Text>
          </View>
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
          <View style={styles.cardTitleRow}>
            <Ionicons name="business-outline" size={18} color={colors.textMuted} />
            <Text style={styles.cardTitle}>Daycare information</Text>
          </View>
          <Text style={styles.row}>{school.name}</Text>
          {school.contactPhone ? <Text style={styles.row}>{school.contactPhone}</Text> : null}
          {school.contactEmail ? <Text style={styles.row}>{school.contactEmail}</Text> : null}
        </View>
      )}

      <View style={styles.card}>
        <View style={styles.cardTitleRow}>
          <Ionicons name="log-out-outline" size={18} color={colors.textMuted} />
          <Text style={styles.cardTitle}>Account</Text>
        </View>
        <Text style={styles.signOutHint}>Sign out to switch account.</Text>
        <Text style={styles.signOutLink} onPress={handleSignOut}>Sign out</Text>
      </View>
    </ScrollView>
  );
}

function createStyles(colors: import('../../theme/colors').ColorPalette) {
  return StyleSheet.create({
    container: { flex: 1, padding: 16, backgroundColor: colors.background },
    card: {
      backgroundColor: colors.card,
      padding: 16,
      borderRadius: 12,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
    cardTitle: { fontSize: 14, fontWeight: '600', color: colors.textMuted },
    themeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 4,
    },
    themeLabel: { fontSize: 14, color: colors.text },
    themeValue: { fontSize: 14, color: colors.textMuted },
    childName: { fontSize: 14, fontWeight: '600', color: colors.text },
    row: { fontSize: 14, color: colors.textMuted, marginTop: 4 },
    label: { fontSize: 12, fontWeight: '600', color: colors.textMuted, marginTop: 12, marginBottom: 4 },
    allergyRow: {},
    tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
    tag: { backgroundColor: colors.dangerMuted, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    tagText: { fontSize: 12, color: colors.danger, fontWeight: '500' },
    emergency: { marginTop: 8 },
    signOutHint: { fontSize: 13, color: colors.textMuted, marginBottom: 12 },
    signOutLink: { fontSize: 14, color: colors.danger, fontWeight: '600' },
  });
}
