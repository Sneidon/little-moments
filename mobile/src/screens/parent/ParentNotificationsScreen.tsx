import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getFunctions, httpsCallable } from 'firebase/functions';
import firebaseApp from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

const NOTIF_KEYS = [
  'nappyChange',
  'napTime',
  'meal',
  'activity',
  'medication',
  'incident',
  'messages',
  'announcements',
  'events',
  'eventReminders',
] as const;

const NOTIF_LABELS: Record<(typeof NOTIF_KEYS)[number], string> = {
  nappyChange: 'Nappy changes',
  napTime: 'Nap time',
  meal: 'Meals',
  activity: 'Activities',
  medication: 'Medication',
  incident: 'Incidents',
  messages: 'Chat messages',
  announcements: 'Announcements',
  events: 'Events',
  eventReminders: 'Event reminders',
};

export function ParentNotificationsScreen() {
  const { profile } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [notifPrefs, setNotifPrefs] = useState<Record<string, boolean>>({
    nappyChange: true,
    napTime: true,
    meal: true,
    activity: true,
    medication: true,
    incident: true,
    messages: true,
    announcements: true,
    events: true,
    eventReminders: true,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const prefs = (profile as { notificationPreferences?: Record<string, boolean> })?.notificationPreferences;
    if (prefs) {
      setNotifPrefs((p) => {
        const merged = { ...p, ...prefs };
        // Backward compatibility: older builds used "media" for photo/incident notifications.
        if (prefs.incident === undefined && prefs.media !== undefined) {
          merged.incident = Boolean(prefs.media);
        }
        return merged;
      });
    }
  }, [profile?.uid]);

  const toggleNotif = (key: string) => {
    setNotifPrefs((p) => ({ ...p, [key]: !p[key] }));
  };

  const save = async () => {
    setSaving(true);
    try {
      const update = httpsCallable<
        { notificationPreferences?: Record<string, boolean> },
        { ok: boolean }
      >(getFunctions(firebaseApp), 'updateParentProfile');
      await update({ notificationPreferences: notifPrefs });
      Alert.alert('Saved', 'Notification preferences updated.');
    } catch {
      Alert.alert('Error', 'Could not save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.card}>
        {NOTIF_KEYS.map((k) => (
          <TouchableOpacity key={k} style={styles.row} onPress={() => toggleNotif(k)} activeOpacity={0.7}>
            <Text style={styles.label}>{NOTIF_LABELS[k]}</Text>
            <Ionicons
              name={notifPrefs[k] ? 'notifications' : 'notifications-off'}
              size={20}
              color={notifPrefs[k] ? colors.primary : colors.textMuted}
            />
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={save}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.saveBtnText}>Save preferences</Text>
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
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
    },
    label: { fontSize: 14, color: colors.text },
    saveBtn: {
      marginTop: 16,
      paddingVertical: 12,
      borderRadius: 8,
      backgroundColor: colors.primary,
      alignItems: 'center',
    },
    saveBtnDisabled: { opacity: 0.6 },
    saveBtnText: { fontSize: 15, fontWeight: '600', color: colors.primaryContrast },
  });
}
