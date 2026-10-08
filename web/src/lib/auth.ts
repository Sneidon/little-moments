import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/config/firebase';

export async function requestPasswordResetEmail(email: string): Promise<void> {
  if (!email?.trim()) {
    throw new Error('Email is required.');
  }
  try {
    await sendPasswordResetEmail(auth, email.trim());
  } catch (err: unknown) {
    const code = err && typeof err === 'object' && 'code' in err ? (err as { code: string }).code : '';
    const message = err && typeof err === 'object' && 'message' in err ? String((err as { message: string }).message) : '';
    if (code === 'auth/user-not-found') {
      throw new Error('No account found with this email.');
    }
    if (code === 'auth/invalid-email') {
      throw new Error('Invalid email address.');
    }
    if (code === 'auth/too-many-requests') {
      throw new Error('Too many attempts. Please try again later.');
    }
    throw new Error(message || 'Failed to send password reset email.');
  }
}
