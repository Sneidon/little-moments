import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { isoNow } from './util';

const FIRESTORE_DELETE_CHUNK = 450;

async function deleteCollectionShallow(
  db: admin.firestore.Firestore,
  colRef: admin.firestore.CollectionReference
): Promise<void> {
  const snap = await colRef.limit(FIRESTORE_DELETE_CHUNK).get();
  if (snap.empty) return;
  const batch = db.batch();
  for (const d of snap.docs) {
    batch.delete(d.ref);
  }
  await batch.commit();
  await deleteCollectionShallow(db, colRef);
}

/** Remove all documents under `schools/{schoolId}` (nested subcollections first). */
async function purgeFirestoreSchoolTree(db: admin.firestore.Firestore, schoolId: string): Promise<void> {
  const schoolRef = db.collection('schools').doc(schoolId);

  const chatsSnap = await schoolRef.collection('chats').get();
  for (const c of chatsSnap.docs) {
    await deleteCollectionShallow(db, c.ref.collection('messages'));
    await c.ref.delete();
  }

  const qrSnap = await schoolRef.collection('qrCodes').get();
  for (const q of qrSnap.docs) {
    await deleteCollectionShallow(db, q.ref.collection('scanLogs'));
    await q.ref.delete();
  }

  const childrenSnap = await schoolRef.collection('children').get();
  for (const ch of childrenSnap.docs) {
    await deleteCollectionShallow(db, ch.ref.collection('reports'));
    await ch.ref.delete();
  }

  const flatCollections = [
    'classes',
    'announcements',
    'events',
    'foodMenus',
    'foodMenusWeekly',
    'dailyCommunications',
    'mealOptions',
    'pendingRegistrations',
  ] as const;
  for (const name of flatCollections) {
    await deleteCollectionShallow(db, schoolRef.collection(name));
  }
}

async function unlinkUsersFromSchool(db: admin.firestore.Firestore, schoolId: string, nowIso: string): Promise<void> {
  const FieldValue = admin.firestore.FieldValue;
  const usersSnap = await db.collection('users').where('schoolId', '==', schoolId).get();
  for (const d of usersSnap.docs) {
    const role = (d.data() as { role?: string }).role;
    const ref = d.ref;
    const patch =
      role === 'principal' || role === 'teacher'
        ? { schoolId: FieldValue.delete(), isActive: false, updatedAt: nowIso }
        : { schoolId: FieldValue.delete(), updatedAt: nowIso };
    await ref.update(patch);
    const after = await ref.get();
    const rd = after.data() as { role?: string } | undefined;
    const claims: Record<string, string> = {};
    if (rd?.role) claims.role = rd.role;
    try {
      await admin.auth().setCustomUserClaims(d.id, claims);
    } catch (e) {
      functions.logger.warn('unlinkUsersFromSchool: setCustomUserClaims failed', d.id, e);
    }
  }
}

async function deleteInviteTokensForSchool(db: admin.firestore.Firestore, schoolId: string): Promise<void> {
  const [bySchoolId, byCreated] = await Promise.all([
    db.collection('inviteTokens').where('schoolId', '==', schoolId).get(),
    db.collection('inviteTokens').where('createdSchoolId', '==', schoolId).get(),
  ]);
  const seen = new Set<string>();
  const del = async (docs: admin.firestore.QueryDocumentSnapshot[]): Promise<void> => {
    for (const docSnap of docs) {
      if (seen.has(docSnap.id)) continue;
      seen.add(docSnap.id);
      await docSnap.ref.delete();
    }
  };
  await del(bySchoolId.docs);
  await del(byCreated.docs);
}

/** Runs full purge; no-ops cleanly if school doc is already gone. */
export async function runSchoolDeletionPurge(db: admin.firestore.Firestore, schoolId: string): Promise<void> {
  const sid = schoolId.trim();
  const schoolRef = db.collection('schools').doc(sid);
  const schoolSnap = await schoolRef.get();
  if (!schoolSnap.exists) {
    functions.logger.warn('runSchoolDeletionPurge: school already absent', { schoolId: sid });
    return;
  }
  const slug = (schoolSnap.data() as { slug?: string }).slug;

  functions.logger.warn('runSchoolDeletionPurge: starting', { schoolId: sid });
  await purgeFirestoreSchoolTree(db, sid);

  const now = isoNow();
  await unlinkUsersFromSchool(db, sid, now);
  await deleteInviteTokensForSchool(db, sid);

  if (slug && typeof slug === 'string' && slug.trim()) {
    const slugRef = db.collection('schoolSlugs').doc(slug.trim());
    const slugSnap = await slugRef.get();
    const mappedId = slugSnap.exists ? (slugSnap.data() as { schoolId?: string }).schoolId : null;
    if (mappedId === sid) {
      await slugRef.delete();
    }
  }

  await schoolRef.delete();
  functions.logger.warn('runSchoolDeletionPurge: completed', { schoolId: sid });
}

export async function claimSchoolDeletionJob(
  db: admin.firestore.Firestore,
  jobRef: admin.firestore.DocumentReference
): Promise<boolean> {
  const nowIso = isoNow();
  let claimed = false;
  await db.runTransaction(async (tx) => {
    const s = await tx.get(jobRef);
    if (!s.exists) return;
    const d = s.data() as { status?: string; scheduledDeleteAt?: string };
    if (d.status !== 'pending') return;
    if (!d.scheduledDeleteAt || d.scheduledDeleteAt > nowIso) return;
    tx.update(jobRef, { status: 'processing', startedAt: nowIso });
    claimed = true;
  });
  return claimed;
}
