/**
 * My Little Moments - Firebase Cloud Functions
 * Per proposal: notifications (FCM + SendGrid), event reminders, media validation.
 * Custom claims for role-based access (role, schoolId) set when user profile is created/updated.
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();

// Set custom claims when a user document is created or updated in Firestore
// so that request.auth.token.role and request.auth.token.schoolId are available in security rules.
export const setUserClaims = functions.firestore
  .document('users/{userId}')
  .onWrite(async (change, context) => {
    const userId = context.params.userId;
    const data = change.after.exists ? change.after.data() : null;
    if (!data || !userId) return null;
    const role = data.role as string | undefined;
    const schoolId = data.schoolId as string | undefined;
    const claims: Record<string, string> = {};
    if (role) claims.role = role;
    if (schoolId) claims.schoolId = schoolId;
    try {
      await admin.auth().setCustomUserClaims(userId, claims);
    } catch (e) {
      functions.logger.error('setUserClaims failed', userId, e);
    }
    return null;
  });

// When a daily report is created, trigger notifications (FCM + SendGrid).
// Proposal: "Trigger notifications via SendGrid for emails and Firebase Cloud Messaging
// when a teacher submits a daily report."
export const onReportCreated = functions.firestore
  .document('schools/{schoolId}/children/{childId}/reports/{reportId}')
  .onCreate(async (snap, context) => {
    const { schoolId, childId } = context.params;
    const report = snap.data();
    functions.logger.info('Report created', { schoolId, childId, type: report?.type });
    // TODO: Fetch child's parentIds from schools/{schoolId}/children/{childId}
    // TODO: Fetch parent FCM tokens from users collection
    // TODO: Send FCM to parent devices
    // TODO: Call SendGrid API to send email to parents
    return null;
  });

// Collect all FCM tokens for users who should receive school notifications (staff + parents with children at school).
async function getFcmTokensForSchool(db: admin.firestore.Firestore, schoolId: string): Promise<string[]> {
  const tokens: string[] = [];
  const seen = new Set<string>();

  // Staff: users with this schoolId (principal, teachers)
  const staffSnap = await db.collection('users').where('schoolId', '==', schoolId).get();
  staffSnap.docs.forEach((d) => {
    const data = d.data() as { fcmTokens?: string[]; isActive?: boolean };
    if (data.isActive === false) return;
    (data.fcmTokens || []).forEach((t: string) => {
      if (t && !seen.has(t)) { seen.add(t); tokens.push(t); }
    });
  });

  // Parents: uids from children at this school
  const childrenSnap = await db.collection('schools').doc(schoolId).collection('children').get();
  const parentIds = new Set<string>();
  childrenSnap.docs.forEach((d) => {
    const parentIdsArr = (d.data() as { parentIds?: string[] }).parentIds || [];
    parentIdsArr.forEach((uid: string) => parentIds.add(uid));
  });
  for (const uid of parentIds) {
    const userSnap = await db.collection('users').doc(uid).get();
    if (!userSnap.exists) continue;
    const data = userSnap.data() as { fcmTokens?: string[]; isActive?: boolean };
    if (data.isActive === false) continue;
    (data.fcmTokens || []).forEach((t: string) => {
      if (t && !seen.has(t)) { seen.add(t); tokens.push(t); }
    });
  }
  return tokens;
}

// When an announcement is created, send push notifications to all school staff and parents.
export const onAnnouncementCreated = functions.firestore
  .document('schools/{schoolId}/announcements/{announcementId}')
  .onCreate(async (snap, context) => {
    const { schoolId } = context.params;
    const data = snap.data() as { title?: string; body?: string };
    const title = (data.title && String(data.title).trim()) || 'New announcement';
    const body = (data.body && String(data.body).trim()) ? String(data.body).trim().slice(0, 150) : '';

    const db = admin.firestore();
    const tokens = await getFcmTokensForSchool(db, schoolId);
    if (tokens.length === 0) {
      functions.logger.info('onAnnouncementCreated: no FCM tokens for school', schoolId);
      return null;
    }

    const message: admin.messaging.MulticastMessage = {
      tokens,
      notification: {
        title: `New: ${title}`,
        body: body ? (body.length >= 150 ? `${body}…` : body) : 'Tap to view.',
      },
      data: { type: 'announcement', schoolId, announcementId: context.params.announcementId },
      android: { priority: 'high' as const },
      apns: { payload: { aps: { sound: 'default', badge: 1 } } },
    };
    try {
      const res = await admin.messaging().sendEachForMulticast(message);
      functions.logger.info('onAnnouncementCreated: sent', res.successCount, 'failed', res.failureCount, 'schoolId', schoolId);
    } catch (e) {
      functions.logger.error('onAnnouncementCreated: send failed', e);
    }
    return null;
  });

// Daily job: send reminder push notifications for announcements posted 24–48h ago.
export const sendAnnouncementReminders = functions.pubsub
  .schedule('0 9 * * *') // 9 AM daily
  .timeZone('Africa/Johannesburg')
  .onRun(async () => {
    const db = admin.firestore();
    const now = new Date();
    const to = new Date(now);
    to.setTime(to.getTime() - 24 * 60 * 60 * 1000); // 24h ago
    const from = new Date(to);
    from.setTime(from.getTime() - 24 * 60 * 60 * 1000); // 48h ago

    const fromIso = from.toISOString();
    const toIso = to.toISOString();

    const schoolsSnap = await db.collection('schools').get();
    for (const schoolDoc of schoolsSnap.docs) {
      const schoolId = schoolDoc.id;
      const annSnap = await db.collection('schools').doc(schoolId).collection('announcements')
        .where('createdAt', '>=', fromIso)
        .where('createdAt', '<', toIso)
        .get();

      for (const annDoc of annSnap.docs) {
        const ann = annDoc.data() as { reminderSentAt?: string; title?: string };
        if (ann.reminderSentAt) continue;

        const tokens = await getFcmTokensForSchool(db, schoolId);
        if (tokens.length === 0) continue;

        const title = (ann.title && String(ann.title).trim()) || 'Announcement';
        const message: admin.messaging.MulticastMessage = {
          tokens,
          notification: {
            title: `Reminder: ${title}`,
            body: 'Tap to view this announcement.',
          },
          data: { type: 'announcement_reminder', schoolId, announcementId: annDoc.id },
          android: { priority: 'high' as const },
          apns: { payload: { aps: { sound: 'default' } } },
        };
        try {
          await admin.messaging().sendEachForMulticast(message);
          await annDoc.ref.update({ reminderSentAt: new Date().toISOString() });
          functions.logger.info('sendAnnouncementReminders: sent reminder for', annDoc.id, schoolId);
        } catch (e) {
          functions.logger.error('sendAnnouncementReminders: failed', annDoc.id, e);
        }
      }
    }
    return null;
  });

// Sync custom claims from the caller's Firestore user document to their Auth token.
// Call this after login so Firestore rules (which use request.auth.token.role) work.
export const syncClaims = functions.https.onCall(async (_data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be signed in.');
  }
  const uid = context.auth.uid;
  const db = admin.firestore();
  const snap = await db.collection('users').doc(uid).get();
  if (!snap.exists) {
    return { ok: false, message: 'No user profile' };
  }
  const data = snap.data() as { role?: string; schoolId?: string };
  const claims: Record<string, string> = {};
  if (data.role) claims.role = data.role;
  if (data.schoolId) claims.schoolId = data.schoolId;
  await admin.auth().setCustomUserClaims(uid, claims);
  return { ok: true };
});

// Register FCM token for push notifications (announcements, reminders, etc.). Call from mobile after getting the token.
export const saveFcmToken = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be signed in.');
  }
  const token = data?.token && typeof data.token === 'string' ? data.token.trim() : null;
  if (!token) {
    throw new functions.https.HttpsError('invalid-argument', 'token is required.');
  }
  const uid = context.auth.uid;
  const db = admin.firestore();
  const userRef = db.collection('users').doc(uid);
  const snap = await userRef.get();
  if (!snap.exists) {
    throw new functions.https.HttpsError('failed-precondition', 'No user profile.');
  }
  const current = (snap.data() as { fcmTokens?: string[] }).fcmTokens || [];
  if (current.includes(token)) return { ok: true };
  const updated = [...current, token].slice(-20); // keep last 20 tokens per user
  await userRef.update({ fcmTokens: updated, updatedAt: new Date().toISOString() });
  return { ok: true };
});

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

// Create a school and a principal user in one step (direct add, no invitation).
// Callable by super_admin only. Creates: Auth user (principal), school doc, users/{uid} profile.
// setUserClaims trigger will set custom claims for the new principal.
export const createSchoolWithPrincipal = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be signed in.');
  }
  const callerUid = context.auth.uid;
  const db = admin.firestore();
  const callerSnap = await db.collection('users').doc(callerUid).get();
  const callerRole = callerSnap.exists ? (callerSnap.data() as { role?: string })?.role : null;
  if (callerRole !== 'super_admin') {
    throw new functions.https.HttpsError('permission-denied', 'Only super admins can create schools.');
  }

  const {
    name,
    address,
    contactEmail,
    contactPhone,
    description,
    website,
    principalEmail,
    principalDisplayName,
    principalPassword,
  } = data as {
    name?: string;
    address?: string;
    contactEmail?: string;
    contactPhone?: string;
    description?: string;
    website?: string;
    principalEmail?: string;
    principalDisplayName?: string;
    principalPassword?: string;
  };

  if (!name || typeof name !== 'string' || !name.trim()) {
    throw new functions.https.HttpsError('invalid-argument', 'School name is required.');
  }
  if (!principalEmail || typeof principalEmail !== 'string' || !principalEmail.trim()) {
    throw new functions.https.HttpsError('invalid-argument', 'Principal email is required.');
  }
  if (!principalPassword || typeof principalPassword !== 'string' || principalPassword.length < 6) {
    throw new functions.https.HttpsError('invalid-argument', 'Principal password must be at least 6 characters.');
  }

  const now = new Date().toISOString();

  const userRecord = await admin.auth().createUser({
    email: principalEmail.trim(),
    password: principalPassword,
    displayName: (principalDisplayName && typeof principalDisplayName === 'string')
      ? principalDisplayName.trim()
      : principalEmail.trim(),
  });
  const principalUid = userRecord.uid;

  const schoolRef = db.collection('schools').doc();
  await schoolRef.set({
    name: name.trim(),
    address: address && typeof address === 'string' ? address.trim() || undefined : undefined,
    contactEmail: contactEmail && typeof contactEmail === 'string' ? contactEmail.trim() || undefined : undefined,
    contactPhone: contactPhone && typeof contactPhone === 'string' ? contactPhone.trim() || undefined : undefined,
    description: description && typeof description === 'string' ? description.trim() || undefined : undefined,
    website: website && typeof website === 'string' ? website.trim() || undefined : undefined,
    subscriptionStatus: 'active',
    createdAt: now,
    updatedAt: now,
  });
  const schoolId = schoolRef.id;

  await db.collection('users').doc(principalUid).set({
    email: principalEmail.trim(),
    displayName: (principalDisplayName && typeof principalDisplayName === 'string')
      ? principalDisplayName.trim()
      : principalEmail.trim(),
    role: 'principal',
    schoolId,
    createdAt: now,
    updatedAt: now,
  });

  return { schoolId, principalUid };
});

// Create a teacher for the principal's school. Callable by principal only.
// Creates Auth user + users/{uid} profile with role=teacher, schoolId=principal's schoolId.
export const createTeacher = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be signed in.');
  }
  const callerUid = context.auth.uid;
  const db = admin.firestore();
  const callerSnap = await db.collection('users').doc(callerUid).get();
  const callerData = callerSnap.exists ? (callerSnap.data() as { role?: string; schoolId?: string }) : null;
  if (callerData?.role !== 'principal' || !callerData?.schoolId) {
    throw new functions.https.HttpsError('permission-denied', 'Only principals can add teachers to their school.');
  }
  const schoolId = callerData.schoolId;

  const { teacherEmail, teacherDisplayName, teacherPreferredName, teacherPassword } = data as {
    teacherEmail?: string;
    teacherDisplayName?: string;
    teacherPreferredName?: string;
    teacherPassword?: string;
  };

  if (!teacherEmail || typeof teacherEmail !== 'string' || !teacherEmail.trim()) {
    throw new functions.https.HttpsError('invalid-argument', 'Teacher email is required.');
  }
  if (!teacherPassword || typeof teacherPassword !== 'string' || teacherPassword.length < 6) {
    throw new functions.https.HttpsError('invalid-argument', 'Teacher password must be at least 6 characters.');
  }

  const now = new Date().toISOString();

  const userRecord = await admin.auth().createUser({
    email: teacherEmail.trim(),
    password: teacherPassword,
    displayName: (teacherDisplayName && typeof teacherDisplayName === 'string')
      ? teacherDisplayName.trim()
      : teacherEmail.trim(),
  });
  const teacherUid = userRecord.uid;

  const displayName = (teacherDisplayName && typeof teacherDisplayName === 'string')
    ? teacherDisplayName.trim()
    : teacherEmail.trim();
  const preferredName = (teacherPreferredName && typeof teacherPreferredName === 'string')
    ? teacherPreferredName.trim()
    : null;
  await db.collection('users').doc(teacherUid).set({
    email: teacherEmail.trim(),
    displayName,
    ...(preferredName ? { preferredName } : {}),
    role: 'teacher',
    schoolId,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  });

  return { teacherUid };
});

// Update a teacher's name or active status. Callable by principal only (for teachers in their school).
export const updateTeacher = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be signed in.');
  }
  const callerUid = context.auth.uid;
  const db = admin.firestore();
  const callerSnap = await db.collection('users').doc(callerUid).get();
  const callerData = callerSnap.exists ? (callerSnap.data() as { role?: string; schoolId?: string }) : null;
  if (callerData?.role !== 'principal' || !callerData?.schoolId) {
    throw new functions.https.HttpsError('permission-denied', 'Only principals can update teachers.');
  }
  const schoolId = callerData.schoolId;

  const { teacherUid, displayName, preferredName, isActive } = data as {
    teacherUid?: string;
    displayName?: string;
    preferredName?: string;
    isActive?: boolean;
  };

  if (!teacherUid || typeof teacherUid !== 'string' || !teacherUid.trim()) {
    throw new functions.https.HttpsError('invalid-argument', 'Teacher UID is required.');
  }

  const teacherRef = db.collection('users').doc(teacherUid);
  const teacherSnap = await teacherRef.get();
  if (!teacherSnap.exists) {
    throw new functions.https.HttpsError('not-found', 'Teacher not found.');
  }
  const teacherData = teacherSnap.data() as { role?: string; schoolId?: string };
  if (teacherData.role !== 'teacher' || teacherData.schoolId !== schoolId) {
    throw new functions.https.HttpsError('permission-denied', 'Can only update teachers in your school.');
  }

  const now = new Date().toISOString();
  const updates: Record<string, unknown> = { updatedAt: now };
  if (displayName !== undefined && typeof displayName === 'string' && displayName.trim()) {
    updates.displayName = displayName.trim();
  }
  if (preferredName !== undefined) {
    updates.preferredName = typeof preferredName === 'string' && preferredName.trim() ? preferredName.trim() : null;
  }
  if (isActive !== undefined) updates.isActive = Boolean(isActive);

  await teacherRef.update(updates);
  return { ok: true };
});

const MAX_PARENTS_PER_CHILD = 4;

// Check whether a user with this email already exists. Callable by principal only.
// Used to decide whether to "link existing" or "create & link" when inviting a parent.
export const checkParentEmail = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be signed in.');
  }
  const callerUid = context.auth.uid;
  const db = admin.firestore();
  const callerSnap = await db.collection('users').doc(callerUid).get();
  const callerData = callerSnap.exists ? (callerSnap.data() as { role?: string; schoolId?: string }) : null;
  if (callerData?.role !== 'principal' || !callerData?.schoolId) {
    throw new functions.https.HttpsError('permission-denied', 'Only principals can check parent email.');
  }
  const { email } = data as { email?: string };
  if (!email || typeof email !== 'string' || !email.trim()) {
    throw new functions.https.HttpsError('invalid-argument', 'Email is required.');
  }
  try {
    await admin.auth().getUserByEmail(email.trim());
    return { exists: true };
  } catch (err: unknown) {
    const code = err && typeof err === 'object' && 'code' in err ? (err as { code: string }).code : '';
    if (code === 'auth/user-not-found') {
      return { exists: false };
    }
    throw err;
  }
});

// Invite a parent to a child. Callable by principal only.
// If a user with that email already exists, links them to the child (adds to parentIds).
// Otherwise creates Auth user + users doc (role=parent) and adds to parentIds. Max 4 parents per child.
export const inviteParentToChild = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be signed in.');
  }
  const callerUid = context.auth.uid;
  const db = admin.firestore();
  const callerSnap = await db.collection('users').doc(callerUid).get();
  const callerData = callerSnap.exists ? (callerSnap.data() as { role?: string; schoolId?: string }) : null;
  if (callerData?.role !== 'principal' || !callerData?.schoolId) {
    throw new functions.https.HttpsError('permission-denied', 'Only principals can invite parents.');
  }
  const schoolId = callerData.schoolId;

  const { childId, parentEmail, parentDisplayName, parentPhone, parentPassword } = data as {
    childId?: string;
    parentEmail?: string;
    parentDisplayName?: string;
    parentPhone?: string;
    parentPassword?: string;
  };

  if (!childId || typeof childId !== 'string' || !childId.trim()) {
    throw new functions.https.HttpsError('invalid-argument', 'Child ID is required.');
  }
  if (!parentEmail || typeof parentEmail !== 'string' || !parentEmail.trim()) {
    throw new functions.https.HttpsError('invalid-argument', 'Parent email is required.');
  }

  const childRef = db.collection('schools').doc(schoolId).collection('children').doc(childId);
  const childSnap = await childRef.get();
  if (!childSnap.exists) {
    throw new functions.https.HttpsError('not-found', 'Child not found.');
  }
  const parentIds = (childSnap.data() as { parentIds?: string[] })?.parentIds ?? [];
  if (parentIds.length >= MAX_PARENTS_PER_CHILD) {
    throw new functions.https.HttpsError(
      'failed-precondition',
      `This child already has the maximum of ${MAX_PARENTS_PER_CHILD} parents.`
    );
  }

  const now = new Date().toISOString();
  const emailTrim = parentEmail.trim();
  const phone = (parentPhone && typeof parentPhone === 'string') ? parentPhone.trim() || undefined : undefined;
  const displayName = (parentDisplayName && typeof parentDisplayName === 'string') ? parentDisplayName.trim() : undefined;

  let parentUid: string;
  let linked = false;

  try {
    const existingUser = await admin.auth().getUserByEmail(emailTrim);
    parentUid = existingUser.uid;
    linked = true;

    if (parentIds.includes(parentUid)) {
      throw new functions.https.HttpsError('failed-precondition', 'This parent is already linked to this child.');
    }

    const userRef = db.collection('users').doc(parentUid);
    const userSnap = await userRef.get();
    const updates: Record<string, unknown> = { updatedAt: now, schoolId };
    if (displayName) updates.displayName = displayName;
    if (phone !== undefined) updates.phone = phone;

    if (userSnap.exists) {
      await userRef.update(updates);
    } else {
      await userRef.set({
        email: emailTrim,
        displayName: displayName ?? emailTrim,
        ...(phone ? { phone } : {}),
        role: 'parent',
        schoolId,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
    }

    const newParentIds = [...parentIds, parentUid];
    await childRef.update({
      parentIds: newParentIds,
      updatedAt: now,
    });
  } catch (err: unknown) {
    const code = err && typeof err === 'object' && 'code' in err ? (err as { code: string }).code : '';
    if (code === 'auth/user-not-found') {
      if (!parentPassword || typeof parentPassword !== 'string' || parentPassword.length < 6) {
        throw new functions.https.HttpsError('invalid-argument', 'Password (min 6 characters) is required for new accounts.');
      }
      const userRecord = await admin.auth().createUser({
        email: emailTrim,
        password: parentPassword,
        displayName: displayName ?? emailTrim,
      });
      parentUid = userRecord.uid;
      await db.collection('users').doc(parentUid).set({
        email: emailTrim,
        displayName: displayName ?? emailTrim,
        ...(phone ? { phone } : {}),
        role: 'parent',
        schoolId,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
      const newParentIds = [...parentIds, parentUid];
      await childRef.update({
        parentIds: newParentIds,
        updatedAt: now,
      });
    } else if (err && typeof err === 'object' && 'message' in err && (err as { message: string }).message?.includes('already linked')) {
      throw err;
    } else {
      throw err;
    }
  }

  return { parentUid, linked };
});

// Update a parent's name, phone, or active status. Callable by principal only (for parents in their school).
export const updateParent = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be signed in.');
  }
  const callerUid = context.auth.uid;
  const db = admin.firestore();
  const callerSnap = await db.collection('users').doc(callerUid).get();
  const callerData = callerSnap.exists ? (callerSnap.data() as { role?: string; schoolId?: string }) : null;
  if (callerData?.role !== 'principal' || !callerData?.schoolId) {
    throw new functions.https.HttpsError('permission-denied', 'Only principals can update parents.');
  }
  const schoolId = callerData.schoolId;

  const { parentUid, displayName, phone, isActive } = data as {
    parentUid?: string;
    displayName?: string;
    phone?: string;
    isActive?: boolean;
  };

  if (!parentUid || typeof parentUid !== 'string' || !parentUid.trim()) {
    throw new functions.https.HttpsError('invalid-argument', 'Parent UID is required.');
  }

  const parentRef = db.collection('users').doc(parentUid);
  const parentSnap = await parentRef.get();
  if (!parentSnap.exists) {
    throw new functions.https.HttpsError('not-found', 'Parent not found.');
  }
  const parentData = parentSnap.data() as { role?: string; schoolId?: string };
  if (parentData.role !== 'parent' || parentData.schoolId !== schoolId) {
    throw new functions.https.HttpsError('permission-denied', 'Can only update parents in your school.');
  }

  const now = new Date().toISOString();
  const updates: Record<string, unknown> = { updatedAt: now };
  if (displayName !== undefined && typeof displayName === 'string' && displayName.trim()) {
    updates.displayName = displayName.trim();
  }
  if (phone !== undefined) {
    updates.phone = typeof phone === 'string' && phone.trim() ? phone.trim() : null;
  }
  if (isActive !== undefined) updates.isActive = Boolean(isActive);

  await parentRef.update(updates);
  return { ok: true };
});

// Scheduled event reminders (one day before). Proposal: "Schedule event reminders one day
// before using Cloud Scheduler, delivering via FCM and SendGrid."
// Use a callable or HTTP function triggered by Cloud Scheduler (cron).
export const sendEventReminders = functions.pubsub
  .schedule('0 8 * * *') // 8 AM daily
  .timeZone('Africa/Johannesburg')
  .onRun(async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const tomorrowEnd = new Date(tomorrow);
    tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);
    // TODO: Query events where startAt is between tomorrow and tomorrowEnd
    // TODO: For each event, get target users and send FCM + SendGrid
    functions.logger.info('Event reminders run');
    return null;
  });
