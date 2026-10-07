import React, { useLayoutEffect } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { useNow } from '../../hooks/useNow';
import type { RootStackParamList } from '../../navigation/types';
import { EventAttachments } from './event-detail/EventAttachments';
import { EventHero } from './event-detail/EventHero';
import { EventLoading, EventMissing } from './event-detail/EventStates';
import { EventSummaryCard } from './event-detail/EventSummaryCard';
import { PastRsvpCard, RsvpBar } from './event-detail/RsvpBar';
import { scheduleContext } from './event-detail/eventDetail';
import { useEventDetail } from './event-detail/useEventDetail';

type Props = NativeStackScreenProps<RootStackParamList, 'ParentEventDetail'>;

export function ParentEventDetailScreen({ route, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const nowMs = useNow();
  const { event, loading, missing, uid, rsvp, share } = useEventDetail(route.params.schoolId, route.params.eventId);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: event?.title ?? 'Event',
      headerRight:
        event && !missing
          ? () => (
              <TouchableOpacity
                onPress={share}
                hitSlop={12}
                style={styles.headerIconBtn}
                accessibilityLabel="Share event"
                accessibilityRole="button"
              >
                <Ionicons name="share-outline" size={22} color={colors.primary} />
              </TouchableOpacity>
            )
          : undefined,
    });
  }, [event, missing, navigation, share, colors.primary]);

  if (loading) return <EventLoading />;
  if (missing || !event) return <EventMissing onBack={() => navigation.goBack()} />;

  const ctx = scheduleContext(event, nowMs);
  const rsvpOpen = ctx.highlight !== 'past' && !!uid;

  return (
    <View style={[styles.screen, { backgroundColor: colors.backgroundSecondary }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + (rsvpOpen ? 132 : 28) }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {event.imageUrl ? <EventHero uri={event.imageUrl} mediaType={event.mediaType} /> : null}
        <EventSummaryCard event={event} ctx={ctx} />
        <EventAttachments event={event} />
        {!rsvpOpen && uid ? <PastRsvpCard mine={rsvp.mine} /> : null}
      </ScrollView>
      {rsvpOpen ? (
        <RsvpBar mine={rsvp.mine} pending={rsvp.pending} editing={rsvp.editing} onRespond={rsvp.respond} onEdit={() => rsvp.setEditing(true)} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  headerIconBtn: { marginRight: 4, padding: 4 },
  content: { paddingHorizontal: 16, paddingTop: 12 },
});
