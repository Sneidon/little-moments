import React from 'react';
import { NAPPY_CONDITIONS, NAPPY_TYPES, normalizeNappyType } from '../constants';
import { SelectField, TextField } from '../fields';
import type { FieldsChange, FormVariant, UpdateFields } from '../types';

type Props = { values: UpdateFields; onChange: FieldsChange; variant: FormVariant; clock: string; editable: boolean };

export function NappyFields({ values, onChange, variant, clock, editable }: Props) {
  const isMain = variant === 'main';
  return (
    <>
      {isMain ? <TextField label="Time" value={clock} placeholder="14:48" readOnly /> : null}
      <SelectField
        label="Type"
        value={normalizeNappyType(values.nappyType)}
        options={NAPPY_TYPES}
        onChange={(nappyType) => onChange({ nappyType })}
        placeholder="Wet"
      />
      <SelectField
        label="Condition"
        value={values.nappyCondition}
        options={NAPPY_CONDITIONS}
        onChange={(nappyCondition) => onChange({ nappyCondition })}
        placeholder="Normal"
      />
      {isMain ? (
        <TextField
          label="Notes (optional)"
          value={values.notes}
          onChangeText={(notes) => onChange({ notes })}
          placeholder="Any additional observations about the nappy change..."
          multiline
          editable={editable}
        />
      ) : null}
    </>
  );
}
