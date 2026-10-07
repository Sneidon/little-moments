import React from 'react';
import { PHOTO_CATEGORIES } from '../constants';
import { FieldLabel, SelectField, TextField } from '../fields';
import type { FieldsChange, FormVariant, UpdateFields } from '../types';
import { MediaPicker } from './MediaPicker';
import { WholeClassToggle } from './WholeClassToggle';

export type MediaAttachment = {
  uri: string | null;
  isVideo: boolean;
  pick: () => void;
  remove: () => void;
  forWholeClass: boolean;
  setForWholeClass: (value: boolean) => void;
};

type Props = {
  values: UpdateFields;
  onChange: FieldsChange;
  variant: FormVariant;
  editable: boolean;
  media?: MediaAttachment;
  rosterLoaded?: boolean;
  childCount?: number;
};

export function MediaFields({ values, onChange, variant, editable, media, rosterLoaded = false, childCount = 0 }: Props) {
  const category = (
    <SelectField
      label="Category"
      value={values.photoCategory}
      options={PHOTO_CATEGORIES}
      onChange={(photoCategory) => onChange({ photoCategory })}
      placeholder="Select category"
    />
  );
  if (variant === 'variation' || !media) return category;
  return (
    <>
      <FieldLabel>Photo or video</FieldLabel>
      <MediaPicker uri={media.uri} isVideo={media.isVideo} disabled={!editable} onPick={media.pick} onRemove={media.remove} />
      <TextField
        label="Caption"
        value={values.notes}
        onChangeText={(notes) => onChange({ notes })}
        placeholder="Describe what you're sharing..."
        multiline
        lines={2}
        editable={editable}
      />
      {category}
      <WholeClassToggle
        value={media.forWholeClass}
        onChange={media.setForWholeClass}
        rosterLoaded={rosterLoaded}
        childCount={childCount}
        disabled={!editable}
      />
    </>
  );
}
