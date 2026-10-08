import React from 'react';
import type { MealOption, ReportType } from '@shared/types';
import { ActivityFields } from './forms/ActivityFields';
import { CheckFields } from './forms/CheckFields';
import { MealFields } from './forms/MealFields';
import { MediaFields, type MediaAttachment } from './forms/MediaFields';
import { MedicationFields } from './forms/MedicationFields';
import { NapFields } from './forms/NapFields';
import { NappyFields } from './forms/NappyFields';
import type { FieldsChange, FormVariant, UpdateFields } from './types';

export type UpdateFormFieldsProps = {
  type: ReportType;
  variant: FormVariant;
  values: UpdateFields;
  onChange: FieldsChange;
  editable: boolean;
  clock: string;
  mealOptions: MealOption[];
  media?: MediaAttachment;
  rosterLoaded?: boolean;
  childCount?: number;
};

export function UpdateFormFields(props: UpdateFormFieldsProps) {
  const { type, variant, values, onChange, editable, clock, mealOptions } = props;
  switch (type) {
    case 'meal':
      return <MealFields values={values} onChange={onChange} variant={variant} mealOptions={mealOptions} clock={clock} />;
    case 'incident':
      return (
        <MediaFields
          values={values}
          onChange={onChange}
          variant={variant}
          editable={editable}
          media={props.media}
          rosterLoaded={props.rosterLoaded}
          childCount={props.childCount}
        />
      );
    case 'nappy_change':
      return <NappyFields values={values} onChange={onChange} variant={variant} clock={clock} editable={editable} />;
    case 'nap_time':
      return <NapFields values={values} onChange={onChange} variant={variant} editable={editable} />;
    case 'medication':
      return <MedicationFields values={values} onChange={onChange} variant={variant} editable={editable} />;
    case 'activity':
      return <ActivityFields values={values} onChange={onChange} variant={variant} clock={clock} editable={editable} />;
    case 'check_in':
    case 'check_out':
      return variant === 'main' ? (
        <CheckFields checkIn={type === 'check_in'} values={values} onChange={onChange} editable={editable} />
      ) : null;
    default:
      return null;
  }
}
