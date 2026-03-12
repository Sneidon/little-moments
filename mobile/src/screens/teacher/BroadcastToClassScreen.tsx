import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { addDoc, collection, doc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { getOrCreateChat } from '../../api/chat';
import type { Child } from '../../../../shared/types';
import type { ClassRoom } from '../../../../shared/types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type Props = NativeStackScreenProps<
  { BroadcastToClass: undefined },
  'BroadcastToClass'
>;

export function BroadcastToClassScreen({ navigation }: Props) {
  const { profile } = useAuth();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const schoolId = profile?.schoolId;
  const uid = profile?.uid;

  useEffect(() => {
    if (!schoolId || !uid) {
      setLoading(false);
      return;
    }
    (async () => {
      const classesSnap = await getDocs(collection(db, 'schools', schoolId, 'classes'));
      const myClasses = classesSnap.docs.filter(
        (d) => (d.data() as ClassRoom).assignedTeacherId === uid
      );
      setClasses(
        myClasses.map((d) => ({
          id: d.id,
          name: (d.data() as ClassRoom).name ?? d.id,
        }))
      );
      setLoading(false);
    })();
  }, [schoolId, uid]);

  const onSend = useCallback(async () => {
    const text = message.trim();
    if (!text || !schoolId || !selectedClassId || !uid) return;

    setSending(true);
    try {
      const childrenSnap = await getDocs(
        query(
          collection(db, 'schools', schoolId, 'children'),
          where('classId', '==', selectedClassId)
        )
      );
      const children = childrenSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Child));
      const parentChildMap = new Map<string, string>();
      for (const child of children) {
        for (const parentId of child.parentIds ?? []) {
          if (!parentChildMap.has(parentId)) {
            parentChildMap.set(parentId, child.id);
          }
        }
      }
      if (parentChildMap.size === 0) {
        Alert.alert('No parents', 'No parents are linked to children in this class.');
        setSending(false);
        return;
      }
      const results: { chatId: string; schoolId: string }[] = [];
      for (const [parentId, childId] of parentChildMap) {
        const r = await getOrCreateChat(schoolId, childId, parentId);
        results.push(r);
      }
      const now = new Date().toISOString();
      await Promise.all(
        results.map(async (r) => {
          const messagesRef = collection(db, 'schools', r.schoolId, 'chats', r.chatId, 'messages');
          const chatRef = doc(db, 'schools', r.schoolId, 'chats', r.chatId);
          await addDoc(messagesRef, { senderId: uid, text, createdAt: now });
          await updateDoc(chatRef, {
            lastMessageText: text.slice(0, 100),
            lastMessageAt: now,
            updatedAt: now,
          });
        })
      );
      Alert.alert('Sent', `Message sent to ${results.length} parent${results.length === 1 ? '' : 's'}.`, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
      setMessage('');
    } catch (e) {
      Alert.alert('Error', 'Could not send message. Please try again.');
    } finally {
      setSending(false);
    }
  }, [message, schoolId, selectedClassId, uid, navigation]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (classes.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.empty}>No classes assigned to you yet.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.label}>Select class</Text>
      <View style={styles.classList}>
        {classes.map((c) => (
          <TouchableOpacity
            key={c.id}
            style={[styles.classBtn, selectedClassId === c.id && styles.classBtnSelected]}
            onPress={() => setSelectedClassId(c.id)}
          >
            <Text style={[styles.classBtnText, selectedClassId === c.id && styles.classBtnTextSelected]}>
              {c.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Message (sent to all parents in the class)</Text>
      <TextInput
        style={styles.input}
        placeholder="Type your message..."
        placeholderTextColor={colors.textMuted}
        multiline
        numberOfLines={4}
        value={message}
        onChangeText={setMessage}
        editable={!sending}
      />

      <TouchableOpacity
        style={[styles.sendBtn, (!selectedClassId || !message.trim() || sending) && styles.sendBtnDisabled]}
        onPress={onSend}
        disabled={!selectedClassId || !message.trim() || sending}
      >
        {sending ? (
          <ActivityIndicator size="small" color={colors.primaryContrast} />
        ) : (
          <Text style={styles.sendBtnText}>Send to class</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

function createStyles(colors: import('../../theme/colors').ColorPalette) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: 16, paddingBottom: 32 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
    empty: { color: colors.textMuted, textAlign: 'center', marginTop: 24 },
    label: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 8 },
    classList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
    classBtn: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 8,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    classBtnSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
    classBtnText: { fontSize: 15, color: colors.text },
    classBtnTextSelected: { color: colors.primaryContrast, fontWeight: '600' },
    input: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      color: colors.text,
      minHeight: 100,
      textAlignVertical: 'top',
    },
    sendBtn: {
      marginTop: 24,
      backgroundColor: colors.primary,
      paddingVertical: 14,
      borderRadius: 8,
      alignItems: 'center',
    },
    sendBtnDisabled: { opacity: 0.5 },
    sendBtnText: { color: colors.primaryContrast, fontWeight: '600', fontSize: 16 },
  });
}
