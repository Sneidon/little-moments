import { collection, doc, getDoc, getDocs, onSnapshot, query, where, type Unsubscribe } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Child, ClassRoom } from '@shared/types';

const MAX_IN_QUERY = 10;

export function subscribeClassChildren(
  schoolId: string,
  classIds: string[],
  onChange: (children: Child[]) => void
): Unsubscribe {
  if (classIds.length === 0) {
    onChange([]);
    return () => {};
  }
  return onSnapshot(
    query(
      collection(db, 'schools', schoolId, 'children'),
      where('classId', 'in', classIds.slice(0, MAX_IN_QUERY)),
      where('isActive', '==', true)
    ),
    (snap) => onChange(snap.docs.map((d) => ({ ...(d.data() as Child), id: d.id })))
  );
}

export async function fetchParentChildren(parentId: string): Promise<Child[]> {
  const schools = await getDocs(collection(db, 'schools'));
  const perSchool = await Promise.all(
    schools.docs.map((s) =>
      getDocs(
        query(collection(db, 'schools', s.id, 'children'), where('parentIds', 'array-contains', parentId), where('isActive', '==', true))
      )
    )
  );
  return perSchool.flatMap((snap) => snap.docs.map((d) => ({ ...(d.data() as Child), id: d.id })));
}

export async function resolveChildTeacherId(child: Child): Promise<string | null> {
  if (child.assignedTeacherId) return child.assignedTeacherId;
  if (!child.classId) return null;
  const snap = await getDoc(doc(db, 'schools', child.schoolId, 'classes', child.classId));
  return snap.exists() ? (snap.data() as ClassRoom).assignedTeacherId ?? null : null;
}

export async function fetchClassChildren(schoolId: string, classId: string): Promise<Child[]> {
  const snap = await getDocs(
    query(collection(db, 'schools', schoolId, 'children'), where('classId', '==', classId), where('isActive', '==', true))
  );
  return snap.docs.map((d) => ({ ...(d.data() as Child), id: d.id }));
}

export function parentChildPairs(children: Child[]): [parentId: string, childId: string][] {
  const pairs = new Map<string, string>();
  for (const child of children) {
    for (const parentId of child.parentIds ?? []) {
      if (!pairs.has(parentId)) pairs.set(parentId, child.id);
    }
  }
  return Array.from(pairs.entries());
}
