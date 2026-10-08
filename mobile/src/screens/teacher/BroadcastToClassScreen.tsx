import React, { useEffect, useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { broadcastToParents } from '../../api/chat';
import { fetchClassChildren, parentChildPairs } from '../../api/children';
import { useTeacherClasses } from '../../hooks';
import { PrimaryButton } from '../../components/brand/Buttons';
import { EmptyCard } from '../../components/brand/EmptyCard';
import { Skeleton } from '../../components/Skeleton';
import { brandFont } from '../../theme/typography';
import { radius, spacing, type BrandPalette } from '../../theme/tokens';
import type { RootStackParamList } from '../../navigation/types';
import { BroadcastIntro, ClassChooser, RecipientBar } from './broadcast/BroadcastParts';
import { recipientSummary, useBroadcastRecipients } from './broadcast/useBroadcastRecipients';
import { useFeedback } from '../../context/FeedbackContext';

type Props = NativeStackScreenProps<RootStackParamList, 'BroadcastToClass'>;

const MESSAGE_MAX = 2000;
const CONFIRM_PARENT_THRESHOLD = 3;

export function BroadcastToClassScreen({ navigation }: Props) {
  const { notify, withLoader } = useFeedback();
  const { profile } = useAuth();
  const { brand } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(brand), [brand]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const { classes, loading } = useTeacherClasses(refreshTrigger);
  const [classId, setClassId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [phase, setPhase] = useState<'idle' | 'chats' | 'messages'>('idle');
  const recipients = useBroadcastRecipients(profile?.schoolId, classId, refreshTrigger);
  const className = classes.find((c) => c.id === classId)?.name;

  useEffect(() => {
    setClassId((prev) => (classes.length === 1 ? classes[0].id : classes.some((c) => c.id === prev) ? prev : null));
  }, [classes]);

  const send = async () => {
    const schoolId = profile?.schoolId;
    const uid = profile?.uid;
    const text = message.trim();
    if (!text || !schoolId || !classId || !uid) return;
    setPhase('chats');
    try {
      const sent = await withLoader(async () => {
        const pairs = parentChildPairs(await fetchClassChildren(schoolId, classId));
        return pairs.length ? broadcastToParents(schoolId, uid, text, pairs, () => setPhase('messages')) : null;
      }, 'Sending…');
      if (sent === null) {
        void notify({ tone: 'warning', title: 'No parents', message: 'No parents are linked to children in this class.' });
        return;
      }
      setMessage('');
      await notify({ tone: 'success', title: 'Sent', message: `Your message was sent to ${sent} parent${sent === 1 ? '' : 's'}.` });
      navigation.goBack();
    } catch {
      void notify({ tone: 'error', title: 'Error', message: 'Could not send message. Please try again.' });
    } finally {
      setPhase('idle');
    }
  };

  const onSend = () => {
    const count = recipients.parentCount ?? 0;
    if (count < CONFIRM_PARENT_THRESHOLD) return void send();
    Alert.alert('Send class message?', `This will post the same message to ${count} separate parent chats.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Send', onPress: () => void send() },
    ]);
  };

  if (loading && classes.length === 0) {
    return (
      <View style={[styles.screen, styles.content]} accessibilityState={{ busy: true }}>
        <Skeleton height={150} borderRadius={radius.cardL} />
        <Skeleton height={52} borderRadius={radius.chip} />
        <Skeleton height={140} borderRadius={radius.chip} />
      </View>
    );
  }

  if (classes.length === 0) {
    return (
      <View style={[styles.screen, styles.content]}>
        <EmptyCard
          icon="school-outline"
          title="No classes assigned"
          body="When you’re assigned to a class, you can message all parents in that class from here."
        />
      </View>
    );
  }

  const sending = phase !== 'idle';
  const canSend = !!classId && !!message.trim() && !sending && !recipients.loading && !recipients.error && (recipients.parentCount ?? 0) > 0;

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 16) }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshControl={<RefreshControl refreshing={false} onRefresh={() => setRefreshTrigger((t) => t + 1)} tintColor={brand.textPrimary} />}
      >
        <BroadcastIntro />
        <Text style={styles.label}>Class</Text>
        <ClassChooser classes={classes} selectedId={classId} onSelect={setClassId} />
        {classId ? (
          <RecipientBar
            text={recipientSummary(recipients)}
            warn={!recipients.loading && (recipients.error || recipients.parentCount === 0)}
          />
        ) : null}
        <Text style={styles.label}>Message</Text>
        <TextInput
          style={styles.input}
          placeholder="Write something for parents…"
          placeholderTextColor={brand.textTertiary}
          multiline
          maxLength={MESSAGE_MAX}
          value={message}
          onChangeText={setMessage}
          editable={!sending}
          textAlignVertical="top"
          accessibilityLabel="Message"
        />
        <View style={styles.charRow}>
          <Text style={styles.hint}>Only you and each parent see their thread.</Text>
          <Text style={styles.hint}>
            {message.length}/{MESSAGE_MAX}
          </Text>
        </View>
        <PrimaryButton
          label={sending ? (phase === 'chats' ? 'Opening chats…' : 'Sending messages…') : `Send${className ? ` to ${className}` : ''}`}
          icon="send"
          loading={sending}
          disabled={!canSend}
          onPress={onSend}
          accessibilityLabel={className ? `Send message to ${recipients.parentCount ?? 0} parents in ${className}` : 'Send message to class'}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function createStyles(brand: BrandPalette) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: brand.background },
    content: { padding: spacing.screenX, gap: spacing.gapM },
    label: { fontFamily: brandFont.body800, fontSize: 14, color: brand.textPrimary, marginTop: 8 },
    input: {
      minHeight: 140,
      borderRadius: radius.chip,
      backgroundColor: brand.surface,
      padding: 14,
      fontSize: 16,
      fontFamily: brandFont.body500,
      color: brand.textPrimary,
    },
    charRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginTop: -6 },
    hint: { fontFamily: brandFont.body500, fontSize: 12, color: brand.textTertiary },
  });
}
