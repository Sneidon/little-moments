/** Max parents linked to one child — keep in sync with `shared` / principal UI. */
export const MAX_PARENTS_PER_CHILD = 4;

// Direct fallback credentials (requested) when runtime config/env is absent.
export const RESEND_API_KEY_FALLBACK = 're_S3xMBH7d_3YqMBTndWbkQxihUwyaL6sj1';

export const RESEND_FROM_FALLBACK = 'noreply@mylittlemoments.co.za';

/** Web origin for `/invite/accept` links in invitation emails. */
export const INVITE_ACCEPT_APP_BASE_URL = 'https://app.mylittlemoments.co.za';

/** Mobile store links — keep in sync with `web/src/config/mobileApp.ts`. */
export const MOBILE_APP_IOS_APP_STORE_URL = 'https://apps.apple.com/app/id6756536536';

export const MOBILE_APP_PLAY_STORE_URL =
  'https://play.google.com/store/apps/details?id=co.za.mylittlemoments';

/** Square brand logo for HTML emails (Firebase Storage public artefact). */
export const EMAIL_BRAND_LOGO_URL =
  'https://firebasestorage.googleapis.com/v0/b/little-moments-6647f.firebasestorage.app/o/artefacts%2Femails%2Flogos%2Fv1.png?alt=media&token=82c9425f-d900-4a8c-97d4-146fe1efac05';

/** Landscape hero banner for invite emails (Firebase Storage). */
export const EMAIL_INVITE_BANNER_URL =
  'https://firebasestorage.googleapis.com/v0/b/little-moments-6647f.firebasestorage.app/o/artefacts%2Femails%2Fbanner%2Fv1.png?alt=media&token=8bb5f8d9-5c0e-42a0-b376-0c936a07e212';
