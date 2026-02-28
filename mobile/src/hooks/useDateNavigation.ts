import { useState, useCallback } from 'react';
import { Platform } from 'react-native';

export type UseDateNavigationOptions = {
  initialDate?: string;
  maxDate?: Date;
  todayLabel?: string;
};

export function useDateNavigation(options: UseDateNavigationOptions = {}) {
  const {
    initialDate = new Date().toISOString().slice(0, 10),
    maxDate = new Date(),
    todayLabel = 'Today',
  } = options;

  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const prevDay = useCallback(() => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().slice(0, 10));
  }, [selectedDate]);

  const nextDay = useCallback(() => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d.toISOString().slice(0, 10));
  }, [selectedDate]);

  const onDatePickerChange = useCallback(
    (event: { type: string }, date?: Date) => {
      if (Platform.OS === 'android') setShowDatePicker(false);
      if (event.type === 'dismissed') return;
      if (date) setSelectedDate(date.toISOString().slice(0, 10));
    },
    []
  );

  const isToday = selectedDate === new Date().toISOString().slice(0, 10);
  const displayDate =
    isToday ? todayLabel : new Date(selectedDate).toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });

  return {
    selectedDate,
    setSelectedDate,
    showDatePicker,
    setShowDatePicker,
    prevDay,
    nextDay,
    onDatePickerChange,
    displayDate,
    isToday,
    maxDate,
  };
}
