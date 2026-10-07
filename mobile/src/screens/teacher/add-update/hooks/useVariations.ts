import { useCallback, useState } from 'react';
import type { MealOption, ReportType } from '@shared/types';
import type { ChildFormOverrides, UpdateFields } from '../types';
import { diffOverride, effectiveValues } from './variations';

export function useVariations(type: ReportType, fields: UpdateFields, mealOptions: MealOption[]) {
  const [overrides, setOverrides] = useState<Record<string, ChildFormOverrides>>({});
  const [editingChildId, setEditingChildId] = useState<string | null>(null);
  const [draft, setDraft] = useState<UpdateFields | null>(null);

  const valuesFor = useCallback(
    (childId: string) => effectiveValues(fields, overrides[childId], mealOptions),
    [fields, overrides, mealOptions]
  );

  const clearFor = useCallback((childId: string) => {
    setOverrides((prev) => {
      if (!(childId in prev)) return prev;
      const next = { ...prev };
      delete next[childId];
      return next;
    });
  }, []);

  const open = useCallback(
    (childId: string) => {
      setEditingChildId(childId);
      setDraft(valuesFor(childId));
    },
    [valuesFor]
  );

  const close = useCallback(() => {
    setEditingChildId(null);
    setDraft(null);
  }, []);

  const save = useCallback(() => {
    if (editingChildId && draft) {
      const next = diffOverride(type, fields, draft, overrides[editingChildId]);
      if (Object.keys(next).length === 0) clearFor(editingChildId);
      else setOverrides((prev) => ({ ...prev, [editingChildId]: next }));
    }
    close();
  }, [editingChildId, draft, type, fields, overrides, clearFor, close]);

  const resetEditing = useCallback(() => {
    if (editingChildId) clearFor(editingChildId);
    close();
  }, [editingChildId, clearFor, close]);

  const patchDraft = useCallback((p: Partial<UpdateFields>) => setDraft((d) => (d ? { ...d, ...p } : d)), []);

  return {
    overrides,
    valuesFor,
    clearFor,
    clearAll: () => setOverrides({}),
    editingChildId,
    draft,
    patchDraft,
    open,
    close,
    save,
    resetEditing,
  };
}
