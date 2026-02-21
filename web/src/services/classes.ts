/**
 * Class/room CRUD for a school. Firestore: schools/{schoolId}/classes
 */
import { collection, addDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import type { ClassRoom } from 'shared/types';

export interface ClassFormData {
  name: string;
  minAgeMonths: number | null;
  maxAgeMonths: number | null;
  assignedTeacherId: string | null;
}

export function toClassFormData(c: ClassRoom): ClassFormData {
  return {
    name: c.name,
    minAgeMonths: c.minAgeMonths ?? null,
    maxAgeMonths: c.maxAgeMonths ?? null,
    assignedTeacherId: c.assignedTeacherId ?? null,
  };
}

export async function createClass(
  schoolId: string,
  data: ClassFormData
): Promise<{ id: string; data: Record<string, unknown> }> {
  const now = new Date().toISOString();
  const payload: Record<string, unknown> = {
    schoolId,
    name: data.name.trim(),
    minAgeMonths: data.minAgeMonths,
    maxAgeMonths: data.maxAgeMonths,
    assignedTeacherId: data.assignedTeacherId,
    createdAt: now,
    updatedAt: now,
  };
  const ref = await addDoc(collection(db, 'schools', schoolId, 'classes'), payload);
  return { id: ref.id, data: payload };
}

export async function updateClass(
  schoolId: string,
  classId: string,
  data: ClassFormData
): Promise<void> {
  const now = new Date().toISOString();
  const payload: Record<string, unknown> = {
    name: data.name.trim(),
    minAgeMonths: data.minAgeMonths,
    maxAgeMonths: data.maxAgeMonths,
    assignedTeacherId: data.assignedTeacherId,
    updatedAt: now,
  };
  await updateDoc(doc(db, 'schools', schoolId, 'classes', classId), payload);
}
