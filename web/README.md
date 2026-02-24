# My Little Moments – Web (Next.js)

Admin web app for **principals** and **super admins**. Teacher flows stay on the mobile app.

## Stack

- **Next.js 14** (App Router)
- **React 18**, **TypeScript**, **Tailwind CSS**
- **Firebase** (Auth, Firestore, Storage)

## Setup

1. Copy `.env.example` to `.env.local` and set your Firebase keys (use `NEXT_PUBLIC_` prefix).
2. `npm install` then `npm run dev`.

## Scripts

- `npm run dev` – development server
- `npm run build` – production build
- `npm run start` – run production build

## Deploy (Firebase App Hosting)

The web app is deployed with **Firebase App Hosting**, which runs the full Next.js app (including dynamic routes and SSR) on Cloud Run. No static export is required.

1. **One-time setup** (from repo root):
   - `firebase apphosting:backends:create --project YOUR_PROJECT_ID`
   - When prompted, set **App root directory** to `web`.
   - Connect your GitHub repo and choose the branch to deploy (e.g. `main`).

2. **Subsequent deploys**: Pushes to the live branch trigger automatic rollouts, or run:
   - `firebase apphosting:rollouts:create --backend BACKEND_ID --project YOUR_PROJECT_ID`

3. **Secrets / env**: Use `web/apphosting.yaml` for env vars or Cloud Secret Manager references; see [Configure App Hosting](https://firebase.google.com/docs/app-hosting/configure).

## Roles (web only)

- **Principal** – `/principal`: dashboard, children, classes, staff, reports, announcements, events, food menus, school settings.
- **Super Admin** – `/admin`: dashboard, schools CRUD, users (filter/search), usage & analytics.

## Firestore structure

- `schools/{schoolId}` – school doc; subcollections: `children`, `classes`, `announcements`, `events`, `foodMenus`; `schools/{schoolId}/children/{childId}/reports`.
- `users` – user profiles (role, schoolId, etc.).
