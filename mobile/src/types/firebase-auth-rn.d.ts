import type { Persistence } from 'firebase/auth';

// firebase/auth's React Native build exports this, but the default typings omit it.
declare module 'firebase/auth' {
  export function getReactNativePersistence(storage: unknown): Persistence;
}
