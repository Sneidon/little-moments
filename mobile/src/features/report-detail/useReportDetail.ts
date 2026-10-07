import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { str, type ReportDoc } from './reportFields';

type State = {
  loading: boolean;
  missing: boolean;
  data: ReportDoc | null;
  imageUrl?: string;
  childName: string | null;
  reporterName: string | null;
};

const INITIAL: State = { loading: true, missing: false, data: null, childName: null, reporterName: null };

async function resolveImageUrl(schoolId: string, data: ReportDoc): Promise<string | undefined> {
  const direct = str(data.imageUrl);
  if (direct || data.type !== 'meal') return direct;
  const mealOptionId = str(data.mealOptionId);
  if (!mealOptionId) return undefined;
  const snap = await getDoc(doc(db, 'schools', schoolId, 'mealOptions', mealOptionId));
  return snap.exists() ? str((snap.data() as { imageUrl?: string }).imageUrl) : undefined;
}

async function fetchReporterName(uid: string | undefined): Promise<string | null> {
  if (!uid) return null;
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    return (snap.exists() && (snap.data() as { displayName?: string }).displayName?.trim()) || null;
  } catch {
    return null;
  }
}

export function useReportDetail(schoolId: string, childId: string, reportId: string): State {
  const [state, setState] = useState<State>(INITIAL);

  useEffect(() => {
    let cancelled = false;
    setState(INITIAL);
    (async () => {
      try {
        const [reportSnap, childSnap] = await Promise.all([
          getDoc(doc(db, 'schools', schoolId, 'children', childId, 'reports', reportId)),
          getDoc(doc(db, 'schools', schoolId, 'children', childId)),
        ]);
        if (!reportSnap.exists()) {
          if (!cancelled) setState({ ...INITIAL, loading: false, missing: true });
          return;
        }
        const data = { id: reportSnap.id, ...reportSnap.data() } as ReportDoc;
        const child = childSnap.exists() ? (childSnap.data() as { preferredName?: string; name?: string }) : null;
        const [imageUrl, reporterName] = await Promise.all([
          resolveImageUrl(schoolId, data),
          fetchReporterName(str(data.reportedBy)),
        ]);
        if (cancelled) return;
        setState({
          loading: false,
          missing: false,
          data,
          imageUrl,
          childName: child?.preferredName?.trim() || child?.name?.trim() || null,
          reporterName,
        });
      } catch {
        if (!cancelled) setState({ ...INITIAL, loading: false, missing: true });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [schoolId, childId, reportId]);

  return state;
}
