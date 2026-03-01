import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getFunctions, httpsCallable } from 'firebase/functions';
import firebaseApp from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

export function ParentProfileScreen() {
  const { profile } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [profileForm, setProfileForm] = useState({
    displayName: profile?.displayName ?? '',
    lastName: (profile as { lastName?: string })?.lastName ?? '',
    phone: profile?.phone ?? '',
  });
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    setProfileForm({
      displayName: profile?.displayName ?? '',
      lastName: (profile as { lastName?: string })?.lastName ?? '',
      phone: profile?.phone ?? '',
    });
  }, [profile?.uid, profile?.displayName, profile?.phone]);

  const saveProfile = async () => {
    setSavingProfile(true);
    try {
      const update = httpsCallable<
        { displayName?: string; lastName?: string; phone?: string },
        { ok: boolean }
      >(getFunctions(firebaseApp), 'updateParentProfile');
      await update({
        displayName: profileForm.displayName.trim(),
        lastName: profileForm.lastName.trim() || undefined,
        phone: profileForm.phone.trim() || undefined,
      });
      Alert.alert('Saved', 'Profile updated.');
    } catch {
      Alert.alert('Error', 'Could not save. Please try again.');
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.card}>
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
        <TouchableOpacity
          style={[styles.saveProfileBtn, savingProfile && styles.saveProfileBtnDisabled]}
          onPress={saveProfile}
          disabled={savingProfile}
        >
          {savingProfile ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.saveProfileText}>Save profile</Text>
          )}
        </TouchableOpacity>
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
    label: { fontSize: 12, fontWeight: '600', color: colors.textMuted, marginTop: 12, marginBottom: 4 },
    themeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 4,
    },
    themeLabel: { fontSize: 14, color: colors.text },
    row: { fontSize: 14, color: colors.textMuted, marginTop: 4 },
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
  });
}
