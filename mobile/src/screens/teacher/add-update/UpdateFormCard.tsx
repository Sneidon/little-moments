import React from 'react';
import { Text, View } from 'react-native';
import type { ReportType } from '@shared/types';
import { UpdateFormFields, type UpdateFormFieldsProps } from './UpdateFormFields';
import { useFormStyles } from './useFormStyles';

const TITLES: Partial<Record<ReportType, string>> = {
  meal: 'Log meal',
  incident: 'Add media',
  nappy_change: 'Nappy change',
  nap_time: 'Nap time',
  medication: 'Medication',
  activity: 'Activity',
  check_in: 'Check in',
  check_out: 'Check out',
};

export function UpdateFormCard(props: Omit<UpdateFormFieldsProps, 'variant'>) {
  const s = useFormStyles();
  return (
    <View style={s.card}>
      <View style={s.cardHead}>
        <Text style={s.cardTitle} accessibilityRole="header">
          {TITLES[props.type] ?? 'Update'}
        </Text>
      </View>
      <UpdateFormFields {...props} variant="main" />
    </View>
  );
}
