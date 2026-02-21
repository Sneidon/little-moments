'use client';

import { useState, useCallback } from 'react';
import { collection, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { uploadMealOptionImage } from '@/utils/uploadImage';
import type { MealOption } from 'shared/types';
import type { MealCategory } from '@/constants/mealOptions';

export interface MealOptionFormState {
  name: string;
  description: string;
  imageFile: File | null;
}

export interface UseMealOptionFormOptions {
  schoolId: string | undefined;
  options: MealOption[];
  optionsByCategory: (category: MealCategory) => MealOption[];
  onSuccess?: () => void;
}

export interface UseMealOptionFormResult {
  showForm: boolean;
  setShowForm: (show: boolean) => void;
  editingId: string | null;
  formCategory: MealCategory;
  form: MealOptionFormState;
  setForm: React.Dispatch<React.SetStateAction<MealOptionFormState>>;
  setFormCategory: (category: MealCategory) => void;
  submitting: boolean;
  startAdd: (category: MealCategory) => void;
  startEdit: (option: MealOption) => void;
  resetForm: () => void;
  submit: (e: React.FormEvent) => Promise<void>;
  deleteOption: (option: MealOption) => Promise<void>;
  canSubmit: boolean;
}

const INITIAL_FORM: MealOptionFormState = {
  name: '',
  description: '',
  imageFile: null,
};

export function useMealOptionForm({
  schoolId,
  options,
  optionsByCategory,
  onSuccess,
}: UseMealOptionFormOptions): UseMealOptionFormResult {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formCategory, setFormCategory] = useState<MealCategory>('breakfast');
  const [form, setForm] = useState<MealOptionFormState>(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);

  const resetForm = useCallback(() => {
    setForm(INITIAL_FORM);
    setEditingId(null);
    setShowForm(false);
    onSuccess?.();
  }, [onSuccess]);

  const startAdd = useCallback((category: MealCategory) => {
    setFormCategory(category);
    setForm(INITIAL_FORM);
    setEditingId(null);
    setShowForm(true);
  }, []);

  const startEdit = useCallback((option: MealOption) => {
    setFormCategory(option.category);
    setForm({
      name: option.name,
      description: option.description || '',
      imageFile: null,
    });
    setEditingId(option.id);
    setShowForm(true);
  }, []);

  const submit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!schoolId || !form.name.trim()) return;
      setSubmitting(true);
      try {
        const now = new Date().toISOString();
        if (editingId) {
          const data: Record<string, unknown> = {
            name: form.name.trim(),
            description: (form.description || '').trim(),
            updatedAt: now,
          };
          if (form.imageFile) {
            data.imageUrl = await uploadMealOptionImage(form.imageFile, schoolId, editingId);
          }
          await updateDoc(doc(db, 'schools', schoolId, 'mealOptions', editingId), data);
        } else {
          const ref = await addDoc(collection(db, 'schools', schoolId, 'mealOptions'), {
            schoolId,
            category: formCategory,
            name: form.name.trim(),
            description: (form.description || '').trim(),
            order: optionsByCategory(formCategory).length,
            createdAt: now,
            updatedAt: now,
          });
          if (form.imageFile) {
            const imageUrl = await uploadMealOptionImage(form.imageFile, schoolId, ref.id);
            await updateDoc(ref, { imageUrl, updatedAt: new Date().toISOString() });
          }
        }
        resetForm();
      } finally {
        setSubmitting(false);
      }
    },
    [schoolId, form, editingId, formCategory, optionsByCategory, resetForm]
  );

  const deleteOption = useCallback(
    async (option: MealOption) => {
      if (!schoolId || !confirm(`Delete "${option.name}"?`)) return;
      await deleteDoc(doc(db, 'schools', schoolId, 'mealOptions', option.id));
      if (editingId === option.id) resetForm();
    },
    [schoolId, editingId, resetForm]
  );

  return {
    showForm,
    setShowForm,
    editingId,
    formCategory,
    form,
    setForm,
    setFormCategory,
    submitting,
    startAdd,
    startEdit,
    resetForm,
    submit,
    deleteOption,
    canSubmit: !!form.name.trim(),
  };
}
