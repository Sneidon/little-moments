import React from 'react';
import { ACTIVITY_TYPES } from '../constants';
import { SelectField, TextField } from '../fields';
import type { FieldsChange, FormVariant, UpdateFields } from '../types';

type Props = { values: UpdateFields; onChange: FieldsChange; variant: FormVariant; clock: string; editable: boolean };

export function ActivityFields({ values, onChange, variant, clock, editable }: Props) {
  const isMain = variant === 'main';
  return (
    <>
      <SelectField
        label="Activity type"
        value={values.activityType}
        options={ACTIVITY_TYPES}
        onChange={(activityType) => onChange({ activityType })}
        placeholder="Select activity type"
      />
      <TextField
        label="Title"
        value={values.activityTitle}
        onChangeText={(activityTitle) => onChange({ activityTitle })}
        placeholder={isMain ? 'e.g. Watercolor painting, Obstacle course' : 'e.g. Watercolor painting'}
        editable={editable}
      />
      <TextField
        label="Description"
        value={values.activityDescription}
        onChangeText={(activityDescription) => onChange({ activityDescription })}
        placeholder={isMain ? 'Describe what the child did and how they engaged…' : 'What the child did…'}
        multiline
        lines={isMain ? 4 : 3}
        editable={editable}
      />
      {isMain ? <TextField label="Time" value={clock} placeholder="10:30" readOnly /> : null}
    </>
  );
}
