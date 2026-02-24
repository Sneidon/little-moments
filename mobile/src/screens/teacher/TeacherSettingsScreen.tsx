import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { signOut } from 'firebase/auth';
import { collection, getDocs } from 'firebase/firestore';
import { auth, db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { useTheme, type ThemeMode } from '../../context/ThemeContext';
import type { ClassRoom } from '../../../../shared/types';

export function TeacherSettingsScreen() {
  const { profile } = useAuth();
  const { colors, themeMode, setThemeMode } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
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

  const cycleTheme = () => {
    const next: ThemeMode = themeMode === 'system' ? 'dark' : themeMode === 'dark' ? 'light' : 'system';
    setThemeMode(next);
  };

  const themeLabel = themeMode === 'system' ? 'System' : themeMode === 'dark' ? 'Dark' : 'Light';

  return (
    <View style={styles.container}>
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

      <View style={styles.card}>
        <View style={styles.cardTitleRow}>
          <Ionicons name="person-outline" size={18} color={colors.textMuted} />
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
          <Ionicons name="log-out-outline" size={18} color={colors.textMuted} />
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
    row: { fontSize: 14, color: colors.text, marginBottom: 4 },
    room: { color: colors.primary, fontWeight: '500' },
    signOutHint: { fontSize: 13, color: colors.textMuted, marginBottom: 12 },
    signOutLink: { fontSize: 14, color: colors.danger, fontWeight: '600' },
  });
}
