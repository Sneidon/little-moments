import React from 'react';
import { TextField } from '../fields';
import type { FieldsChange, FormVariant, UpdateFields } from '../types';

type Props = { values: UpdateFields; onChange: FieldsChange; variant: FormVariant; editable: boolean };

export function MedicationFields({ values, onChange, variant, editable }: Props) {
  const isMain = variant === 'main';
  return (
    <>
      <TextField
        label="Medication name"
        value={values.medicationName}
        onChangeText={(medicationName) => onChange({ medicationName })}
        placeholder="e.g. Paracetamol"
        autoCapitalize="words"
        editable={editable}
      />
      <TextField
        label="Dosage administered"
        hint={isMain ? 'Required. Include amount and unit (e.g. 5 ml, 1 tablet).' : 'Required. Include amount and unit.'}
        value={values.medicationDosage}
        onChangeText={(medicationDosage) => onChange({ medicationDosage })}
        placeholder="e.g. 5 ml, 1 tablet"
        editable={editable}
      />
      {isMain ? (
        <TextField
          label="Notes (optional)"
          value={values.notes}
          onChangeText={(notes) => onChange({ notes })}
          placeholder="Route, observations, or follow-up…"
          multiline
          editable={editable}
        />
      ) : null}
    </>
  );
}
