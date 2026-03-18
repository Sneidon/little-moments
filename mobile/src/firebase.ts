/**
 * Re-exports Firebase app/db for paths like `import { firebaseApp } from '../firebase'`.
 * Prefer importing from `config/firebase` in new code.
 */
import app, { db } from './config/firebase';

export const firebaseApp = app;
export { db };
export default app;
