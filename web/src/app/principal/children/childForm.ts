import type { Child, ChildGender } from 'shared/types';
import { isValidIsoDateString } from '@/components/DateOfBirthField';

export type ChildFormState = {
  name: string;
  preferredName: string;
  dateOfBirth: string;
  gender: '' | ChildGender;
  allergies: string[];
  allergyInput: string;
  medicalNotes: string;
  enrollmentDate: string;
  emergencyContact: string;
  emergencyContactName: string;
  classId: string;
  isActive: boolean;
};

export const EMPTY_CHILD_FORM: ChildFormState = {
  name: '',
  preferredName: '',
  dateOfBirth: '',
  gender: '',
  allergies: [],
  allergyInput: '',
  medicalNotes: '',
  enrollmentDate: '',
  emergencyContact: '',
  emergencyContactName: '',
  classId: '',
  isActive: true,
};

export function formFromChild(c: Child): ChildFormState {
  return {
    name: c.name,
    preferredName: c.preferredName ?? '',
    dateOfBirth: c.dateOfBirth?.slice(0, 10) ?? '',
    gender: c.gender ?? '',
    allergies: c.allergies ?? [],
    allergyInput: '',
    medicalNotes: c.medicalNotes ?? '',
    enrollmentDate: c.enrollmentDate?.slice(0, 10) ?? '',
    emergencyContact: c.emergencyContact ?? '',
    emergencyContactName: c.emergencyContactName ?? '',
    classId: c.classId ?? '',
    isActive: c.isActive !== false,
  };
}

export function isChildFormValid(form: ChildFormState): boolean {
  const enrollment = form.enrollmentDate.trim();
  return (
    !!form.name.trim() &&
    isValidIsoDateString(form.dateOfBirth) &&
    !!form.emergencyContactName.trim() &&
    !!form.emergencyContact.trim() &&
    (!enrollment || isValidIsoDateString(enrollment))
  );
}

function withPendingAllergy(allergies: string[], pendingInput: string): string[] {
  const list = allergies.filter(Boolean);
  const pending = pendingInput.trim();
  return !pending || list.includes(pending) ? list : [...list, pending];
}

// Firestore rejects undefined, so optional fields are written as null.
export function childFieldsFromForm(form: ChildFormState): Record<string, unknown> {
  const enrolled = Boolean(form.isActive);
  const enrollment = form.enrollmentDate.trim();
  return {
    name: form.name.trim(),
    dateOfBirth: form.dateOfBirth,
    allergies: withPendingAllergy(form.allergies, form.allergyInput),
    emergencyContact: form.emergencyContact.trim(),
    emergencyContactName: form.emergencyContactName.trim(),
    classId: enrolled ? form.classId || null : null,
    updatedAt: new Date().toISOString(),
    isActive: enrolled,
    preferredName: form.preferredName.trim() || null,
    medicalNotes: form.medicalNotes.trim() || null,
    enrollmentDate: enrollment && isValidIsoDateString(enrollment) ? enrollment : null,
    gender: form.gender || null,
  };
}

export type EnrollmentFilter = 'all' | 'active' | 'inactive';

export function filterChildren(children: Child[], enrollment: EnrollmentFilter, classId: string, search: string): Child[] {
  const q = search.trim().toLowerCase();
  return children.filter((c) => {
    if (enrollment === 'active' && c.isActive === false) return false;
    if (enrollment === 'inactive' && c.isActive !== false) return false;
    if (classId && c.classId !== classId) return false;
    return !q || (c.name ?? '').toLowerCase().includes(q) || (c.preferredName ?? '').toLowerCase().includes(q);
  });
}
