import { useEffect, useState } from 'react';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { useAuth } from '../../../context/AuthContext';
import type { Child, ClassRoom, School } from '@shared/types';

async function loadChildren(uid: string): Promise<Child[]> {
  const schools = await getDocs(collection(db, 'schools'));
  const perSchool = await Promise.all(
    schools.docs.map((s) =>
      getDocs(
        query(collection(db, 'schools', s.id, 'children'), where('parentIds', 'array-contains', uid), where('isActive', '==', true))
      )
    )
  );
  return perSchool.flatMap((snap) => snap.docs.map((d) => ({ ...(d.data() as Child), id: d.id })));
}

async function loadSchool(schoolId: string): Promise<School | null> {
  const snap = await getDoc(doc(db, 'schools', schoolId));
  return snap.exists() ? { ...(snap.data() as School), id: snap.id } : null;
}

async function loadClassName(schoolId: string, classId: string): Promise<string> {
  const snap = await getDoc(doc(db, 'schools', schoolId, 'classes', classId));
  return (snap.exists() && (snap.data() as ClassRoom).name?.trim()) || classId;
}

export function useParentFamily() {
  const { profile, selectedChildId, setSelectedChildId } = useAuth();
  const [children, setChildren] = useState<Child[]>([]);
  const [school, setSchool] = useState<School | null | undefined>(undefined);
  const [className, setClassName] = useState<string | null>(null);

  useEffect(() => {
    if (!profile?.uid) return;
    let cancelled = false;
    loadChildren(profile.uid).then((list) => {
      if (!cancelled) setChildren(list);
    });
    return () => {
      cancelled = true;
    };
  }, [profile?.uid]);

  useEffect(() => {
    if (children.length > 0 && selectedChildId && !children.some((c) => c.id === selectedChildId)) {
      setSelectedChildId(children[0].id);
    }
  }, [children, selectedChildId, setSelectedChildId]);

  const selectedChild = children.find((c) => c.id === selectedChildId) ?? children[0];

  useEffect(() => {
    if (!selectedChild) return;
    let cancelled = false;
    setSchool(undefined);
    setClassName(null);
    loadSchool(selectedChild.schoolId)
      .then((s) => !cancelled && setSchool(s))
      .catch(() => !cancelled && setSchool(null));
    if (selectedChild.classId) {
      loadClassName(selectedChild.schoolId, selectedChild.classId)
        .then((n) => !cancelled && setClassName(n))
        .catch(() => undefined);
    }
    return () => {
      cancelled = true;
    };
  }, [selectedChild?.id, selectedChild?.schoolId, selectedChild?.classId]);

  return { selectedChild, school, className };
}
