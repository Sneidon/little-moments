import React from 'react';
import { Text } from 'react-native';
import { TextField } from '../fields';
import { useFormStyles } from '../useFormStyles';
import type { FieldsChange, UpdateFields } from '../types';

type Props = { checkIn: boolean; values: UpdateFields; onChange: FieldsChange; editable: boolean };

export function CheckFields({ checkIn, values, onChange, editable }: Props) {
  const s = useFormStyles();
  return (
    <>
      <Text style={[s.helper, { marginTop: 16 }]}>The current time will be saved when you post this update.</Text>
      <TextField
        label="Notes (optional)"
        value={values.notes}
        onChangeText={(notes) => onChange({ notes })}
        placeholder={checkIn ? 'Add any check-in details...' : 'Add any check-out details...'}
        multiline
        editable={editable}
      />
    </>
  );
}
