import { useEffect, useState } from 'react';
import { fetchClassChildren, parentChildPairs } from '../../../api/children';

export function useBroadcastRecipients(schoolId: string | undefined, classId: string | null, refreshTrigger: number) {
  const [childCount, setChildCount] = useState<number | null>(null);
  const [parentCount, setParentCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    setChildCount(null);
    setParentCount(null);
    setError(false);
    if (!schoolId || !classId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetchClassChildren(schoolId, classId)
      .then((children) => {
        if (cancelled) return;
        setChildCount(children.length);
        setParentCount(parentChildPairs(children).length);
      })
      .catch(() => !cancelled && setError(true))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [schoolId, classId, refreshTrigger]);

  return { childCount, parentCount, loading, error };
}

export function recipientSummary({ childCount, parentCount, loading, error }: ReturnType<typeof useBroadcastRecipients>): string {
  if (loading) return 'Counting families…';
  if (error) return 'Couldn’t load roster. Pull down to retry.';
  if (childCount === null || parentCount === null) return '-';
  if (parentCount === 0) return 'No linked parents in this class';
  return `${childCount} ${childCount === 1 ? 'child' : 'children'} · ${parentCount} parent${parentCount === 1 ? '' : 's'}`;
}
