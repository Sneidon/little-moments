import { collection, onSnapshot, query, where, type Unsubscribe } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Child } from '@shared/types';

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
