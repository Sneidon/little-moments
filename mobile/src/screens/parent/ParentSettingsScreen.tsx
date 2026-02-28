import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { signOut } from 'firebase/auth';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import firebaseApp, { auth, db } from '../../config/firebase';
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
  const [profileForm, setProfileForm] = useState({
    displayName: profile?.displayName ?? '',
    lastName: (profile as { lastName?: string })?.lastName ?? '',
    phone: profile?.phone ?? '',
  });
  const [notifPrefs, setNotifPrefs] = useState<Record<string, boolean>>({
    nappyChange: true,
    napTime: true,
    meal: true,
    medication: true,
    incident: true,
    media: true,
    announcements: true,
    events: true,
    eventReminders: true,
  });
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    setProfileForm({
      displayName: profile?.displayName ?? '',
      lastName: (profile as { lastName?: string })?.lastName ?? '',
      phone: profile?.phone ?? '',
    });
    const prefs = (profile as { notificationPreferences?: Record<string, boolean> })?.notificationPreferences;
    if (prefs) setNotifPrefs((p) => ({ ...p, ...prefs }));
  }, [profile?.uid, profile?.displayName, profile?.phone]);

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

  const saveProfile = async () => {
    setSavingProfile(true);
    try {
      const update = httpsCallable<
        { displayName?: string; lastName?: string; phone?: string; notificationPreferences?: Record<string, boolean> },
        { ok: boolean }
      >(getFunctions(firebaseApp), 'updateParentProfile');
      await update({
        displayName: profileForm.displayName.trim(),
        lastName: profileForm.lastName.trim() || undefined,
        phone: profileForm.phone.trim() || undefined,
        notificationPreferences: notifPrefs,
      });
      Alert.alert('Saved', 'Profile updated.');
    } catch {
      Alert.alert('Error', 'Could not save. Please try again.');
    } finally {
      setSavingProfile(false);
    }
  };

  const toggleNotif = (key: string) => {
    setNotifPrefs((p) => ({ ...p, [key]: !p[key] }));
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.card}>
        <View style={styles.cardTitleRow}>
          <Ionicons name="person-outline" size={18} color={colors.textMuted} />
          <Text style={styles.cardTitle}>Your profile</Text>
        </View>
        <Text style={styles.label}>Name</Text>
        <TextInput
          style={styles.input}
          value={profileForm.displayName}
          onChangeText={(t) => setProfileForm((p) => ({ ...p, displayName: t }))}
          placeholder="First name"
          placeholderTextColor={colors.textMuted}
        />
        <Text style={styles.label}>Last name</Text>
        <TextInput
          style={styles.input}
          value={profileForm.lastName}
          onChangeText={(t) => setProfileForm((p) => ({ ...p, lastName: t }))}
          placeholder="Last name"
          placeholderTextColor={colors.textMuted}
        />
        <Text style={styles.label}>Email (read-only)</Text>
        <Text style={styles.row}>{profile?.email ?? '—'}</Text>
        <Text style={styles.label}>Phone</Text>
        <TextInput
          style={styles.input}
          value={profileForm.phone}
          onChangeText={(t) => setProfileForm((p) => ({ ...p, phone: t }))}
          placeholder="Phone number"
          placeholderTextColor={colors.textMuted}
        />
        <Text style={[styles.label, { marginTop: 16 }]}>Notification preferences</Text>
        {(['nappyChange', 'napTime', 'meal', 'medication', 'incident', 'media', 'announcements', 'events', 'eventReminders'] as const).map((k) => (
          <TouchableOpacity key={k} style={styles.themeRow} onPress={() => toggleNotif(k)} activeOpacity={0.7}>
            <Text style={styles.themeLabel}>
              {k === 'nappyChange' && 'Nappy changes'}
              {k === 'napTime' && 'Nap time'}
              {k === 'meal' && 'Meals'}
              {k === 'medication' && 'Medication'}
              {k === 'incident' && 'Incidents'}
              {k === 'media' && 'Photos/media'}
              {k === 'announcements' && 'Announcements'}
              {k === 'events' && 'Events'}
              {k === 'eventReminders' && 'Event reminders'}
            </Text>
            <Ionicons name={notifPrefs[k] ? 'notifications' : 'notifications-off'} size={20} color={notifPrefs[k] ? colors.primary : colors.textMuted} />
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={[styles.saveProfileBtn, savingProfile && styles.saveProfileBtnDisabled]} onPress={saveProfile} disabled={savingProfile}>
          {savingProfile ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveProfileText}>Save profile</Text>}
        </TouchableOpacity>
      </View>

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
          <Ionicons name="help-circle-outline" size={18} color={colors.textMuted} />
          <Text style={styles.cardTitle}>Support</Text>
        </View>
        <TouchableOpacity style={styles.themeRow} onPress={() => Alert.alert('FAQ', 'Common questions: How to add a child? Principals use Children page. How to log meals? Teachers use Add Update. How to view updates? Parents see them in the app. Need more? Email support@mylittlemoments.com')} activeOpacity={0.7}>
          <Text style={styles.themeLabel}>FAQ</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.themeRow} onPress={() => Alert.alert('Contact support', 'Email: support@mylittlemoments.com\n\nWe respond within 1–2 business days.')} activeOpacity={0.7}>
          <Text style={styles.themeLabel}>Contact support</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

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
    input: {
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 8,
      padding: 10,
      fontSize: 14,
      color: colors.text,
      marginTop: 4,
    },
    saveProfileBtn: {
      marginTop: 16,
      paddingVertical: 12,
      borderRadius: 8,
      backgroundColor: colors.primary,
      alignItems: 'center',
    },
    saveProfileBtnDisabled: { opacity: 0.6 },
    saveProfileText: { fontSize: 15, fontWeight: '600', color: colors.primaryContrast },
    signOutHint: { fontSize: 13, color: colors.textMuted, marginBottom: 12 },
    signOutLink: { fontSize: 14, color: colors.danger, fontWeight: '600' },
  });
}
