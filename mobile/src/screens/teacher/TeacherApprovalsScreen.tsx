import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput } from 'react-native';
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';

import app, { db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { font } from '../../theme/typography';

type PendingRegistrationDoc = {
  id: string;
  parentUid: string;
  childId: string;
  classId: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
};

export function TeacherApprovalsScreen() {
  const { profile } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [items, setItems] = useState<PendingRegistrationDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [reasonDraft, setReasonDraft] = useState<Record<string, string>>({});

  useEffect(() => {
    const schoolId = profile?.schoolId;
    const uid = profile?.uid;
    if (!schoolId || !uid) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const q = query(
      collection(db, 'schools', schoolId, 'pendingRegistrations'),
      where('teacherId', '==', uid),
      where('status', '==', 'PENDING'),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as PendingRegistrationDoc[];
        setItems(list);
        setLoading(false);
      },
      () => {
        setItems([]);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [profile?.schoolId, profile?.uid]);

  const decide = async (registrationId: string, approved: boolean) => {
    const functions = getFunctions(app);
    const fn = httpsCallable<{ registrationId: string; approved: boolean; reason?: string }, { ok: boolean }>(
      functions,
      'approveOrRejectParent'
    );
    const reason = (reasonDraft[registrationId] || '').trim();
    await fn({ registrationId, approved, reason: !approved && reason ? reason : undefined });
  };

  const onApprove = (id: string) => {
    Alert.alert('Approve registration?', 'Parent will gain access immediately.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Approve',
        style: 'default',
        onPress: () => {
          decide(id, true).catch((e) => Alert.alert('Error', e instanceof Error ? e.message : 'Failed'));
        },
      },
    ]);
  };

  const onReject = (id: string) => {
    Alert.alert('Reject registration?', 'You can optionally add a reason.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject',
        style: 'destructive',
        onPress: () => {
          decide(id, false).catch((e) => Alert.alert('Error', e instanceof Error ? e.message : 'Failed'));
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>New registrations</Text>
        <Text style={styles.subtitle}>Approve or reject parents requesting access to your class.</Text>

        {loading ? (
          <Text style={styles.muted}>Loading…</Text>
        ) : items.length === 0 ? (
          <Text style={styles.muted}>No pending registrations.</Text>
        ) : (
          items.map((it) => (
            <View key={it.id} style={styles.card}>
              <Text style={styles.cardTitle}>Registration request</Text>
              <Text style={styles.cardMeta}>Received: {new Date(it.createdAt).toLocaleString()}</Text>
              <TextInput
                value={reasonDraft[it.id] || ''}
                onChangeText={(t) => setReasonDraft((r) => ({ ...r, [it.id]: t }))}
                placeholder="Reason (optional for reject)"
                placeholderTextColor={colors.textMuted}
                style={styles.reasonInput}
                multiline
              />
              <View style={styles.actionsRow}>
                <TouchableOpacity style={[styles.actionBtn, styles.rejectBtn]} onPress={() => onReject(it.id)} activeOpacity={0.8}>
                  <Text style={styles.actionText}>Reject</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, styles.approveBtn]} onPress={() => onApprove(it.id)} activeOpacity={0.8}>
                  <Text style={[styles.actionText, { color: '#FFFFFF' }]}>Approve</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

function createStyles(colors: import('../../theme/colors').ColorPalette) {
  const f = (w: 'regular' | 'medium' | 'semiBold' | 'bold') => ({ fontFamily: font[w] });
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.backgroundSecondary },
    content: { padding: 16, paddingBottom: 28 },
    title: { fontSize: 20, color: colors.text, ...f('bold') },
    subtitle: { marginTop: 6, fontSize: 13, color: colors.textMuted, ...f('medium') },
    muted: { marginTop: 14, color: colors.textMuted, ...f('medium') },
    card: {
      marginTop: 14,
      backgroundColor: colors.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      padding: 14,
    },
    cardTitle: { fontSize: 15, color: colors.text, ...f('semiBold') },
    cardMeta: { marginTop: 4, fontSize: 12, color: colors.textMuted, ...f('medium') },
    reasonInput: {
      marginTop: 10,
      minHeight: 44,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 12,
      paddingHorizontal: 10,
      paddingVertical: 8,
      color: colors.text,
      ...f('regular'),
    },
    actionsRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
    actionBtn: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
    },
    approveBtn: { backgroundColor: colors.primary, borderColor: colors.primary },
    rejectBtn: { backgroundColor: 'transparent', borderColor: colors.cardBorder },
    actionText: { fontSize: 14, color: colors.text, ...f('semiBold') },
  });
}

