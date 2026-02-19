/**
 * Seed Firestore for My Little Moments.
 *
 * Prereqs:
 * 1. Create Auth users in Firebase Console (principal, teacher, parent, super_admin).
 * 2. Download a service account key (Project settings → Service accounts → Generate key).
 *
 * Run:
 *   export GOOGLE_APPLICATION_CREDENTIALS=./path-to-serviceAccountKey.json
 *   PRINCIPAL_UID=xxx TEACHER_UID=yyy PARENT_UID=zzz SUPER_ADMIN_UID=www node scripts/seed-firebase.js
 *
 * All four UIDs are required. Use the same UID for two roles if you only have one test user.
 */

const admin = require('firebase-admin');

const PRINCIPAL_UID = process.env.PRINCIPAL_UID;
const TEACHER_UID = process.env.TEACHER_UID;
const PARENT_UID = process.env.PARENT_UID;
const SUPER_ADMIN_UID = process.env.SUPER_ADMIN_UID;

if (!PRINCIPAL_UID || !TEACHER_UID || !PARENT_UID || !SUPER_ADMIN_UID) {
  console.error('Set PRINCIPAL_UID, TEACHER_UID, PARENT_UID, SUPER_ADMIN_UID');
  process.exit(1);
}

if (!admin.apps.length) {
  admin.initializeApp({ projectId: process.env.GCLOUD_PROJECT || undefined });
}

const db = admin.firestore();
const now = new Date().toISOString();

async function seed() {
  console.log('Seeding Firestore...');

  const schoolRef = db.collection('schools').doc();
  await schoolRef.set({
    name: 'Sunshine Daycare',
    address: '123 Main St',
    contactEmail: 'office@sunshine.com',
    contactPhone: '+1 555 123 4567',
    createdAt: now,
    updatedAt: now,
  });
  const schoolId = schoolRef.id;
  console.log('  school:', schoolId);

  const classRef = db.collection('schools').doc(schoolId).collection('classes').doc();
  await classRef.set({
    schoolId,
    name: 'Rainbow Room',
    assignedTeacherId: TEACHER_UID,
    createdAt: now,
    updatedAt: now,
  });
  const classId = classRef.id;
  console.log('  class:', classId);

  const users = [
    { uid: SUPER_ADMIN_UID, email: 'superadmin@test.com', displayName: 'Super Admin', role: 'super_admin' },
    { uid: PRINCIPAL_UID, email: 'principal@test.com', displayName: 'Principal User', role: 'principal', schoolId },
    { uid: TEACHER_UID, email: 'teacher@test.com', displayName: 'Ms. Sarah Johnson', role: 'teacher', schoolId },
    { uid: PARENT_UID, email: 'parent@test.com', displayName: 'Maria Rodriguez', role: 'parent' },
  ];
  for (const u of users) {
    const { uid, schoolId: sid, ...rest } = u;
    await db.collection('users').doc(uid).set({
      ...rest,
      schoolId: sid || undefined,
      createdAt: now,
      updatedAt: now,
    });
  }
  console.log('  users: 4 docs');

  const childRef = db.collection('schools').doc(schoolId).collection('children').doc();
  await childRef.set({
    schoolId,
    name: 'Emma Rodriguez',
    dateOfBirth: '2022-06-15',
    allergies: ['Peanuts', 'Tree nuts'],
    emergencyContact: '+1 555 987 6543',
    assignedTeacherId: TEACHER_UID,
    classId,
    parentIds: [PARENT_UID],
    createdAt: now,
    updatedAt: now,
  });
  console.log('  child:', childRef.id);

  console.log('Done. Log in on web as principal@test.com or superadmin@test.com; on mobile as teacher@test.com or parent@test.com.');
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
