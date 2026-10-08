import React, { useState } from 'react';
import { Platform, Text, TextInput, TouchableOpacity, View, type StyleProp, type TextStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../../../context/ThemeContext';
import { clockToDate, formatClock } from './constants';
import { useFormStyles } from './useFormStyles';

export function FieldLabel({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  const s = useFormStyles();
  return <Text style={[s.label, style]}>{children}</Text>;
}

export function FieldHint({ children }: { children: React.ReactNode }) {
  const s = useFormStyles();
  return <Text style={s.hint}>{children}</Text>;
}

type TextFieldProps = {
  label: string;
  value: string;
  onChangeText?: (text: string) => void;
  placeholder: string;
  multiline?: boolean;
  lines?: number;
  editable?: boolean;
  readOnly?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words';
  hint?: string;
};

export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
  lines = 3,
  editable = true,
  readOnly,
  autoCapitalize,
  hint,
}: TextFieldProps) {
  const s = useFormStyles();
  const { brand } = useTheme();
  return (
    <>
      <FieldLabel>{label}</FieldLabel>
      {hint ? <FieldHint>{hint}</FieldHint> : null}
      <TextInput
        style={[s.input, multiline && s.inputMultiline, readOnly && s.inputReadOnly]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={brand.textTertiary}
        multiline={multiline}
        numberOfLines={multiline ? lines : undefined}
        editable={!readOnly && editable}
        autoCapitalize={autoCapitalize}
        accessibilityLabel={label}
      />
    </>
  );
}

type Option = { value: string; label: string };

type SelectFieldProps = {
  label: string;
  value: string | null;
  options: Option[];
  onChange: (value: string) => void;
  placeholder: string;
};

export function SelectField({ label, value, options, onChange, placeholder }: SelectFieldProps) {
  const s = useFormStyles();
  const { brand } = useTheme();
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);
  return (
    <>
      <FieldLabel>{label}</FieldLabel>
      <TouchableOpacity
        style={s.select}
        onPress={() => setOpen((o) => !o)}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${selected?.label ?? placeholder}`}
        accessibilityState={{ expanded: open }}
      >
        <Text style={[s.selectText, !selected && s.selectPlaceholder]}>{selected?.label ?? placeholder}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={20} color={brand.textTertiary} />
      </TouchableOpacity>
      {open ? (
        <View style={s.options}>
          {options.map((o) => (
            <TouchableOpacity
              key={o.value}
              style={s.option}
              onPress={() => {
                onChange(o.value);
                setOpen(false);
              }}
              accessibilityRole="button"
            >
              <Text style={s.optionText}>{o.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
    </>
  );
}

type TimeFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

export function TimeField({ label, value, onChange, disabled }: TimeFieldProps) {
  const s = useFormStyles();
  const { brand } = useTheme();
  const [open, setOpen] = useState(false);
  return (
    <>
      <FieldLabel>{label}</FieldLabel>
      <TouchableOpacity
        style={s.select}
        onPress={() => setOpen((o) => !o)}
        disabled={disabled}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value || 'not set'}`}
      >
        <Text style={[s.selectText, !value && s.selectPlaceholder]}>{value || `Select ${label.toLowerCase()}`}</Text>
        <Ionicons name="time-outline" size={20} color={brand.textTertiary} />
      </TouchableOpacity>
      {open ? (
        <>
          <DateTimePicker
            value={clockToDate(value)}
            mode="time"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(_event, date) => {
              if (Platform.OS === 'android') setOpen(false);
              if (date) onChange(formatClock(date));
            }}
          />
          {Platform.OS === 'ios' ? (
            <TouchableOpacity style={s.pickerDone} onPress={() => setOpen(false)} accessibilityRole="button">
              <Text style={s.pickerDoneText}>Done</Text>
            </TouchableOpacity>
          ) : null}
        </>
      ) : null}
    </>
  );
}
