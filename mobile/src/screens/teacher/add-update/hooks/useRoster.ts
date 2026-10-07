import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { useAuth } from '../../../../context/AuthContext';
import { usePresentChildIds, useTeacherClassChildren } from '../../../../hooks';
import { ineligibleSelectionMessage, isChildEligibleForUpdateType } from '../../../../utils/childPresence';
import type { ReportType } from '@shared/types';

export function useRoster(type: ReportType, initialChildId: string | undefined, onDeselect: (childId: string) => void) {
  const { profile } = useAuth();
  const { children, loading } = useTeacherClassChildren();
  const { presentChildIds, loadingPresence } = usePresentChildIds(profile?.schoolId, children);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const didAutoSelect = useRef(false);
  const rosterLoaded = !loading;

  const isEligible = useCallback(
    (childId: string) => isChildEligibleForUpdateType(childId, presentChildIds, type),
    [presentChildIds, type]
  );

  useEffect(() => {
    if (!rosterLoaded || loadingPresence || children.length === 0 || didAutoSelect.current) return;
    didAutoSelect.current = true;
    if (initialChildId && children.some((c) => c.id === initialChildId) && isEligible(initialChildId)) {
      setSelectedIds([initialChildId]);
      return;
    }
    const first = children.find((c) => isEligible(c.id));
    setSelectedIds(first ? [first.id] : []);
  }, [rosterLoaded, loadingPresence, children, initialChildId, isEligible]);

  useEffect(() => {
    if (loadingPresence) return;
    setSelectedIds((prev) => {
      const next = prev.filter(isEligible);
      if (next.length === prev.length) return prev;
      prev.filter((id) => !next.includes(id)).forEach(onDeselect);
      return next;
    });
  }, [type, presentChildIds, loadingPresence, isEligible, onDeselect]);

  const toggle = useCallback(
    (childId: string) => {
      if (!isEligible(childId)) {
        Alert.alert('Not available', ineligibleSelectionMessage(type));
        return;
      }
      setSelectedIds((prev) => {
        if (!prev.includes(childId)) return [...prev, childId];
        onDeselect(childId);
        return prev.filter((id) => id !== childId);
      });
    },
    [isEligible, type, onDeselect]
  );

  const selectAll = useCallback(
    () => setSelectedIds(children.filter((c) => isEligible(c.id)).map((c) => c.id)),
    [children, isEligible]
  );

  const clear = useCallback(() => setSelectedIds([]), []);

  return {
    children,
    rosterLoaded,
    loadingPresence,
    selectedIds,
    selectedChildren: children.filter((c) => selectedIds.includes(c.id)),
    isEligible,
    toggle,
    selectAll,
    clear,
  };
}
