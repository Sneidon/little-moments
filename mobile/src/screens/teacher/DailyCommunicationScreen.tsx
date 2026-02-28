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
import { Ionicons } from '@expo/vector-icons';
import { collection, addDoc, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import type { ClassRoom } from '../../../../shared/types';

export function DailyCommunicationScreen({
  navigation,
  route,
}: {
  navigation: { goBack: () => void };
  route?: { params?: { classId?: string } };
}) {
  const { profile } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [message, setMessage] = useState('');
  const [selectedClassId, setSelectedClassId] = useState<string | null>(route?.params?.classId ?? null);
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    const schoolId = profile?.schoolId;
    const uid = profile?.uid;
    if (!schoolId || !uid) {
      setLoadingClasses(false);
      return;
    }
    (async () => {
      const snap = await getDocs(collection(db, 'schools', schoolId, 'classes'));
      const list = snap.docs
        .filter((d) => (d.data() as ClassRoom).assignedTeacherId === uid)
        .map((d) => ({ id: d.id, ...d.data() } as ClassRoom));
      setClasses(list);
      if (list.length > 0 && !selectedClassId) setSelectedClassId(list[0].id);
      setLoadingClasses(false);
    })();
  }, [profile?.schoolId, profile?.uid]);

  const save = async () => {
    const schoolId = profile?.schoolId;
    const uid = profile?.uid;
    if (!schoolId || !uid || !message.trim()) {
      Alert.alert('Missing info', 'Please enter the planned activity for the day.');
      return;
    }
    const classId = selectedClassId ?? classes[0]?.id;
    if (!classId) {
      Alert.alert('No class', 'You need at least one class assigned.');
      return;
    }
    setSaving(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      await addDoc(collection(db, 'schools', schoolId, 'dailyCommunications'), {
        schoolId,
        classId,
        createdBy: uid,
        message: message.trim(),
        date: today,
        createdAt: new Date().toISOString(),
      });
      Alert.alert('Sent', 'All parents have been notified.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      Alert.alert('Error', 'Could not send. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loadingClasses) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.label}>Class</Text>
        <View style={styles.classRow}>
          {classes.map((c) => (
            <TouchableOpacity
              key={c.id}
              style={[
                styles.classChip,
                selectedClassId === c.id && styles.classChipSelected,
              ]}
              onPress={() => setSelectedClassId(c.id)}
            >
              <Text
                style={[
                  styles.classChipText,
                  selectedClassId === c.id && styles.classChipTextSelected,
                ]}
              >
                {c.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      <View style={styles.card}>
        <Text style={styles.label}>Planned activity for the day</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Outdoor play, arts & crafts, story time..."
          placeholderTextColor={colors.textMuted}
          value={message}
          onChangeText={setMessage}
          multiline
          numberOfLines={4}
        />
        <Text style={styles.hint}>All parents in this class will receive a notification.</Text>
      </View>
      <TouchableOpacity
        style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
        onPress={save}
        disabled={saving || !message.trim()}
      >
        {saving ? (
          <ActivityIndicator size="small" color={colors.primaryContrast} />
        ) : (
          <>
            <Ionicons name="send" size={20} color={colors.primaryContrast} />
            <Text style={styles.saveBtnText}>Send to all parents</Text>
          </>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

function createStyles(colors: import('../../theme/colors').ColorPalette) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: 16, paddingBottom: 32 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    card: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
      marginBottom: 8,
    },
    classRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    classChip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      backgroundColor: colors.background,
    },
    classChipSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.primaryMuted ?? colors.primary + '20',
    },
    classChipText: { fontSize: 14, color: colors.text },
    classChipTextSelected: { color: colors.primary, fontWeight: '600' },
    input: {
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 8,
      padding: 12,
      fontSize: 15,
      color: colors.text,
      minHeight: 100,
      textAlignVertical: 'top',
    },
    hint: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 8,
    },
    saveBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: colors.primary,
      paddingVertical: 14,
      borderRadius: 12,
    },
    saveBtnDisabled: { opacity: 0.6 },
    saveBtnText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.primaryContrast,
    },
  });
}
