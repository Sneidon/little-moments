import { addDoc, collection, doc, getDocs, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '@/config/firebase';
import type { Child, ClassRoom } from 'shared/types';
import type { ConfirmedParentAssignment } from '@/components/ParentLinkOrInvitePanel';
import { getCallableErrorMessage, inviteParentToChild, principalInviteParent } from '@/services/parents';

const BATCH_LIMIT = 450;

async function backfillIsActive(schoolId: string, docs: Awaited<ReturnType<typeof getDocs>>['docs']): Promise<boolean> {
  const missing = docs.filter((d) => !Object.prototype.hasOwnProperty.call(d.data(), 'isActive'));
  if (missing.length === 0) return false;
  const now = new Date().toISOString();
  for (let i = 0; i < missing.length; i += BATCH_LIMIT) {
    const batch = writeBatch(db);
    for (const d of missing.slice(i, i + BATCH_LIMIT)) batch.update(d.ref, { isActive: true, updatedAt: now });
    await batch.commit();
  }
  return true;
}

// Older child documents predate the isActive flag; default them to enrolled so roster filters treat them correctly.
export async function loadSchoolRoster(schoolId: string): Promise<{ children: Child[]; classes: ClassRoom[] }> {
  const childrenRef = collection(db, 'schools', schoolId, 'children');
  const [childrenSnap, classesSnap] = await Promise.all([getDocs(childrenRef), getDocs(collection(db, 'schools', schoolId, 'classes'))]);
  const finalSnap = (await backfillIsActive(schoolId, childrenSnap.docs)) ? await getDocs(childrenRef) : childrenSnap;
  return {
    children: finalSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Child),
    classes: classesSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as ClassRoom),
  };
}

export async function createChild(schoolId: string, fields: Record<string, unknown>): Promise<Child> {
  const data = { schoolId, ...fields, parentIds: [], createdAt: new Date().toISOString() };
  const ref = await addDoc(collection(db, 'schools', schoolId, 'children'), data);
  return { id: ref.id, ...data } as unknown as Child;
}

export async function updateChild(schoolId: string, existing: Child | undefined, childId: string, fields: Record<string, unknown>) {
  await updateDoc(doc(db, 'schools', schoolId, 'children', childId), {
    ...fields,
    parentIds: existing?.parentIds ?? [],
    createdAt: existing?.createdAt ?? fields.updatedAt,
  });
}

export async function assignParents(childId: string, parents: ConfirmedParentAssignment[]): Promise<string | null> {
  for (const parent of parents) {
    const params = {
      childId,
      parentEmail: parent.parentEmail,
      parentDisplayName: parent.parentDisplayName,
      parentPhone: parent.parentPhone,
    };
    try {
      if (parent.mode === 'link') await inviteParentToChild(params);
      else await principalInviteParent(params);
    } catch (err) {
      return getCallableErrorMessage(err);
    }
  }
  return null;
}
