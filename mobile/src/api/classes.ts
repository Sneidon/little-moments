import { collection, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { ClassRoom } from '@shared/types';

export async function fetchTeacherClasses(schoolId: string, teacherId: string): Promise<ClassRoom[]> {
  const snap = await getDocs(collection(db, 'schools', schoolId, 'classes'));
  return snap.docs
    .map((d) => ({ ...(d.data() as ClassRoom), id: d.id }))
    .filter((c) => c.assignedTeacherId === teacherId)
    .sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '', undefined, { sensitivity: 'base' }));
}
