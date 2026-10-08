import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Get or create a teacher–parent chat for a given child. otherParticipantId is the parent's uid (when caller is teacher) or teacher's uid (when caller is parent).
export const getOrCreateChat = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be signed in.');
  }
  const { schoolId, childId, otherParticipantId } = data as {
    schoolId?: string;
    childId?: string;
    otherParticipantId?: string;
  };
  if (!schoolId || !childId || !otherParticipantId || typeof schoolId !== 'string' || typeof childId !== 'string' || typeof otherParticipantId !== 'string') {
    throw new functions.https.HttpsError('invalid-argument', 'schoolId, childId, and otherParticipantId are required.');
  }
  const callerUid = context.auth.uid;
  const db = admin.firestore();
  const callerSnap = await db.collection('users').doc(callerUid).get();
  const callerData = callerSnap.exists ? (callerSnap.data() as { role?: string; schoolId?: string }) : null;
  const callerRole = callerData?.role;
  const childRef = db.collection('schools').doc(schoolId).collection('children').doc(childId);
  const childSnap = await childRef.get();
  if (!childSnap.exists) {
    throw new functions.https.HttpsError('not-found', 'Child not found.');
  }
  const child = childSnap.data() as { parentIds?: string[]; assignedTeacherId?: string; schoolId?: string; classId?: string };
  const parentIds = child.parentIds ?? [];
  const childAssignedTeacherId = child.assignedTeacherId;
  // Teacher may be assigned on the child or on the child's class
  let isTeacherForChild = childAssignedTeacherId === callerUid;
  if (callerRole === 'teacher' && !isTeacherForChild && child.classId) {
    const classSnap = await db.collection('schools').doc(schoolId).collection('classes').doc(child.classId).get();
    const classData = classSnap.exists ? (classSnap.data() as { assignedTeacherId?: string }) : null;
    isTeacherForChild = classData?.assignedTeacherId === callerUid;
  }
  let teacherId: string;
  let parentId: string;
  if (callerRole === 'teacher') {
    if (callerData?.schoolId !== schoolId) {
      throw new functions.https.HttpsError('permission-denied', 'You are not a teacher at this school.');
    }
    if (!isTeacherForChild) {
      throw new functions.https.HttpsError('permission-denied', 'You are not the assigned teacher for this child.');
    }
    if (!parentIds.includes(otherParticipantId)) {
      throw new functions.https.HttpsError('permission-denied', 'The other participant is not a parent of this child.');
    }
    teacherId = callerUid;
    parentId = otherParticipantId;
  } else if (callerRole === 'parent') {
    if (!parentIds.includes(callerUid)) {
      throw new functions.https.HttpsError('permission-denied', 'You are not a parent of this child.');
    }
    let isTeacherForChildParent = childAssignedTeacherId === otherParticipantId;
    if (!isTeacherForChildParent && child.classId) {
      const classSnapP = await db.collection('schools').doc(schoolId).collection('classes').doc(child.classId).get();
      const classDataP = classSnapP.exists ? (classSnapP.data() as { assignedTeacherId?: string }) : null;
      isTeacherForChildParent = classDataP?.assignedTeacherId === otherParticipantId;
    }
    if (!isTeacherForChildParent) {
      throw new functions.https.HttpsError('permission-denied', 'The other participant is not the assigned teacher for this child.');
    }
    teacherId = otherParticipantId;
    parentId = callerUid;
  } else {
    throw new functions.https.HttpsError('permission-denied', 'Only teachers and parents can start a chat.');
  }
  const chatId = `${childId}_${teacherId}_${parentId}`;
  const chatRef = db.collection('schools').doc(schoolId).collection('chats').doc(chatId);
  const chatSnap = await chatRef.get();
  if (chatSnap.exists) {
    return { chatId, schoolId };
  }
  const now = new Date().toISOString();
  await chatRef.set({
    schoolId,
    teacherId,
    parentId,
    childId,
    createdAt: now,
    updatedAt: now,
  });
  return { chatId, schoolId };
});
