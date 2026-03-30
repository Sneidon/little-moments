# Firebase seed guide – get started

Use this to get **My Little Moments** (web + mobile) working with real data.

## 1. Firebase project setup

1. In [Firebase Console](https://console.firebase.google.com/), create or select a project.
2. **Authentication** → enable **Email/Password** sign-in.
3. **Firestore Database** → create database (start in **test mode** for local dev; lock down with rules before production).
4. **Storage** → get started (needed for future photo uploads).
5. Under **Project settings** → **General**, add a web app if needed and copy the config into:
   - **Web**: `web/.env.local` (use `NEXT_PUBLIC_FIREBASE_*`).
   - **Mobile**: `mobile/.env` or app config (use `EXPO_PUBLIC_FIREBASE_*`).

---

## 2. Create Auth users (manual)

Create these users in **Authentication** → **Users** → **Add user**:

| Email                 | Password (e.g.) | Role         |
|-----------------------|-----------------|-------------|
| `superadmin@test.com` | `test1234`      | super_admin |
| `principal@test.com`  | `test1234`      | principal   |
| `teacher@test.com`    | `test1234`      | teacher     |
| `parent@test.com`     | `test1234`      | parent      |

After creating each user, copy its **User UID** (e.g. `xYz123...`). You’ll need these for the seed script.

---

## 3. Seed Firestore (script)

From the **project root** (`my-little-moments/`):

```bash
# Install dependencies (one-time)
npm install

# Set your service account key (Firebase Console → Project settings → Service accounts → Generate new private key)
export GOOGLE_APPLICATION_CREDENTIALS=./path-to-serviceAccountKey.json

# Run seed with the UIDs from step 2 (replace with your real UIDs from Auth console)
PRINCIPAL_UID=xxx TEACHER_UID=yyy PARENT_UID=zzz SUPER_ADMIN_UID=www npm run seed
```

The script creates:

- **1 school** – e.g. “Sunshine Daycare”
- **1 class** – e.g. “Rainbow Room” (assigned to the teacher)
- **4 user profiles** in `users` (principal, teacher, parent, super_admin) with the UIDs you passed
- **1 child** – e.g. “Emma Rodriguez”, linked to the teacher and the parent

You can then:

- **Web**: log in as `principal@test.com` or `superadmin@test.com`.
- **Mobile**: log in as `teacher@test.com` or `parent@test.com`.

---

## 4. Firestore structure (reference)

If you prefer to seed by hand or debug, use this layout.

### Top-level collections

**`users`** (document ID = Firebase Auth UID)

```json
{
  "email": "principal@test.com",
  "displayName": "Principal User",
  "role": "principal",
  "schoolId": "<school-doc-id>",
  "createdAt": "2025-01-01T00:00:00.000Z",
  "updatedAt": "2025-01-01T00:00:00.000Z"
}
```

- `role`: `super_admin` | `principal` | `teacher` | `parent`
- `schoolId`: required for `principal` and `teacher`; omit for `super_admin` and `parent`.

**`schools`** (document ID = auto or custom)

```json
{
  "name": "Sunshine Daycare",
  "address": "123 Main St",
  "contactEmail": "office@sunshine.com",
  "contactPhone": "+1 555 123 4567",
  "createdAt": "2025-01-01T00:00:00.000Z",
  "updatedAt": "2025-01-01T00:00:00.000Z"
}
```

### Subcollections under `schools/{schoolId}`

**`classes`**

```json
{
  "schoolId": "<schoolId>",
  "name": "Rainbow Room",
  "assignedTeacherId": "<teacher-auth-uid>",
  "createdAt": "2025-01-01T00:00:00.000Z",
  "updatedAt": "2025-01-01T00:00:00.000Z"
}
```

**`children`**

```json
{
  "schoolId": "<schoolId>",
  "name": "Emma Rodriguez",
  "dateOfBirth": "2022-06-15",
  "allergies": ["Peanuts", "Tree nuts"],
  "emergencyContact": "+1 555 987 6543",
  "assignedTeacherId": "<teacher-auth-uid>",
  "classId": "<class-doc-id>",
  "parentIds": ["<parent-auth-uid>"],
  "createdAt": "2025-01-01T00:00:00.000Z",
  "updatedAt": "2025-01-01T00:00:00.000Z"
}
```

**`children/{childId}/reports`** (daily logs – optional for seed)

```json
{
  "childId": "<childId>",
  "schoolId": "<schoolId>",
  "type": "meal",
  "mealType": "lunch",
  "reportedBy": "<teacher-uid>",
  "notes": "Ate well",
  "timestamp": "2025-01-15T12:00:00.000Z",
  "createdAt": "2025-01-15T12:00:00.000Z"
}
```

`type`: `nappy_change` | `meal` | `nap_time` | `medication` | `incident`

**`announcements`**, **`events`**, **`foodMenus`** – optional; add via the web app after logging in.

---

## 5. Firestore indexes (if needed)

If you see “index required” errors in the app, create composite indexes in **Firestore** → **Indexes** as suggested in the error message. Common ones:

- `schools/{schoolId}/children`: `assignedTeacherId` (ASC)
- `schools/{schoolId}/children`: `parentIds` (array-contains)
- `schools/{schoolId}/announcements`: `createdAt` (DESC)
- `schools/{schoolId}/events`: `startAt` (DESC)
- `schools/{schoolId}/children/{childId}/reports`: `timestamp` (DESC)

---

## 6. Quick test

1. **Web** (`npm run dev` in `web/`): sign in as `principal@test.com` → you should see the dashboard and the seeded school/class/child.
2. **Mobile** (Expo in `mobile/`): sign in as `teacher@test.com` → you should see “Rainbow Room” and the child; as `parent@test.com` → you should see the child and reports (after adding some as teacher).

Remove or change test users and passwords before going to production.

---

## 7. Push notifications (mobile)

### Firebase config files (Android & iOS)

The mobile app expects Firebase config files in **`mobile/firebase/`** (so the app is self-contained for EAS Build):

- **Android**: `mobile/firebase/google-services.json`
- **iOS**: `mobile/firebase/GoogleService-Info.plist`

Download these from Firebase Console → Project settings → Your apps (add Android/iOS apps with package `co.za.mylittlemoments` and bundle ID `co.za.mylittlemoments` if needed). The Expo config plugin `@react-native-firebase/app` copies them into the native projects at prebuild.

### Backend alignment

The **Cloud Functions** send push notifications via **Firebase Cloud Messaging (FCM)**:

- **`saveFcmToken`** (callable): mobile calls this after login with the device FCM token; tokens are stored in `users/{uid}.fcmTokens` (max 20 per user).
- **Triggers that send FCM**:
  - **Daily communication** created → parents in that class get a notification (`type: daily_communication`).
  - **Announcement** created → all school staff and parents get a notification (`type: announcement`).
  - **Announcement reminder** (scheduled) → reminder for announcements 24–48h old (`type: announcement_reminder`).
  - **Event reminder** (scheduled) → events happening tomorrow (`type: event_reminder`).

All messages use `admin.messaging().sendEachForMulticast()` with `notification` (title, body) and `data` (e.g. `type`, `schoolId`, `announcementId`, `eventId`). The mobile app registers the FCM token on login and handles notification-opened navigation (e.g. tap opens Announcements or Events).

### Building the mobile app for push (EAS Build)

Push requires a **native build** (Expo Go does not include FCM). Build with EAS from the **mobile** directory:

```bash
cd mobile
eas build --platform android   # or --platform ios, or both
```

Ensure `mobile/firebase/google-services.json` and `mobile/firebase/GoogleService-Info.plist` exist before building so the plugin can copy them into the native projects. The mobile app uses this local `firebase/` folder so it is self-contained and works with EAS Build without depending on the repo root.
