import React from 'react';
import { SLEEP_QUALITY_OPTIONS } from '../constants';
import { FieldHint, SelectField, TextField, TimeField } from '../fields';
import type { FieldsChange, FormVariant, UpdateFields } from '../types';

type Props = { values: UpdateFields; onChange: FieldsChange; variant: FormVariant; editable: boolean };

export function NapFields({ values, onChange, variant, editable }: Props) {
  const isMain = variant === 'main';
  return (
    <>
      {!isMain ? <FieldHint>Use a different end time if this child was picked up early.</FieldHint> : null}
      <TimeField
        label="Start Time"
        value={values.napStartTime}
        onChange={(napStartTime) => onChange({ napStartTime })}
        disabled={!editable}
      />
      <TimeField
        label="End Time"
        value={values.napEndTime}
        onChange={(napEndTime) => onChange({ napEndTime })}
        disabled={!editable}
      />
      <SelectField
        label="Sleep Quality"
        value={values.sleepQuality}
        options={SLEEP_QUALITY_OPTIONS}
        onChange={(sleepQuality) => onChange({ sleepQuality })}
        placeholder="Good - Fell asleep easily"
      />
      {isMain ? (
        <TextField
          label="Notes (optional)"
          value={values.notes}
          onChangeText={(notes) => onChange({ notes })}
          placeholder="Any additional observations..."
          multiline
          editable={editable}
        />
      ) : null}
    </>
  );
}
