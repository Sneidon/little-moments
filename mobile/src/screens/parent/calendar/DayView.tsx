import React from 'react';
import { Text, View } from 'react-native';
import { useThemedStyles } from '../../../hooks/useThemedStyles';
import type { Event } from '@shared/types';
import { addDays } from './calendarUtils';
import { CalendarNav } from './CalendarNav';
import { createCalendarStyles } from './calendarStyles';
import { EventRow } from './EventRow';

type Props = {
  cursor: Date;
  events: Event[];
  nowMs: number;
  onCursorChange: (date: Date) => void;
  onOpen: (event: Event) => void;
};

export function DayView({ cursor, events, nowMs, onCursorChange, onOpen }: Props) {
  const shared = useThemedStyles(createCalendarStyles);
  return (
    <View style={shared.card}>
      <CalendarNav
        title={cursor.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        compact
        titleLines={2}
        onPrev={() => onCursorChange(addDays(cursor, -1))}
        onNext={() => onCursorChange(addDays(cursor, 1))}
      />
      {events.length === 0 ? (
        <Text style={shared.mutedCenter}>Nothing scheduled on this day.</Text>
      ) : (
        events.map((ev) => <EventRow key={ev.id} event={ev} nowMs={nowMs} large onPress={() => onOpen(ev)} />)
      )}
    </View>
  );
}
