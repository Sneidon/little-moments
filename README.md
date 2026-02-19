# My Little Moments

Real-time communication app for creches and pre-schools—replacing traditional communication books. Built per the Architecture Proposal (Mukondleteri Dumela).

## Structure

- **mobile/** — React Native (Expo) app for teachers and parents (iOS, Android, Huawei)
- **web/** — React + Tailwind CSS admin app for principals and super admins
- **functions/** — Firebase Cloud Functions (notifications, reminders, media validation)
- **firebase/** — Firestore and Storage rules, indexes

## Tech Stack

| Layer | Stack |
|-------|--------|
| Mobile | React Native, Expo, React Navigation, Context API, FCM |
| Web | React, Tailwind CSS, React Router, Context API/Redux, FCM |
| Backend | Firebase Auth, Firestore, Storage, Cloud Functions, FCM |
| Email | SendGrid (custom domain) |

## Roles

- **Teacher** — Daily reports (nappy, meal, nap, medication, incident), media uploads, announcements/events
- **Parent** — Notifications, child profiles, accept/decline events
- **Principal** — Reports overview, add child/staff, announcements, events, food menus
- **Super Admin** — User management, school config, usage dashboards

## Setup

1. **Firebase**: Create a project, enable Auth (email/password), Firestore, Storage, Cloud Functions, FCM. Use Blaze Plan for production.
2. **Mobile**: `cd mobile && npm install && npx expo start`
3. **Web**: `cd web && npm install && npm run dev`
4. **Functions**: `cd functions && npm install && npm run build`
5. Copy `mobile/.env.example` → `mobile/.env` and `web/.env.example` → `web/.env` with your Firebase config.

## Accounts (from proposal)

- Apple Developer, Google Play, Huawei AppGallery
- Firebase (Blaze Plan), GitHub, SendGrid
- Custom domain (e.g. app.mylittlemoments.com, notifications.mylittlemoments.com)
