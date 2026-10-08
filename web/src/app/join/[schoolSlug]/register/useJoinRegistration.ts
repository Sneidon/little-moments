import { useEffect, useMemo, useState } from 'react';
import {
  fetchJoinClasses,
  fetchQrPrefill,
  isPhotoTooLarge,
  registerViaQr,
  suggestClasses,
  trackJoinEvent,
  uploadJoinPhoto,
  type ChildDetails,
  type ClassItem,
  type ParentDetails,
} from './joinApi';

const MISSING_SESSION = 'Missing session token. Please go back and try again.';

export function useJoinRegistration(slug: string, sessionToken: string, qr: string) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [parent, setParent] = useState<ParentDetails>({ name: '', mobile: '', email: '', whatsappOptIn: false });
  const [child, setChild] = useState<ChildDetails>({ firstName: '', surname: '', dob: '', classId: '' });
  const [popiaConsent, setPopiaConsent] = useState(false);
  const [photo, setPhoto] = useState<{ uploading: boolean; url: string | null }>({ uploading: false, url: null });
  const [success, setSuccess] = useState<{ teacherName: string | null; className: string | null } | null>(null);
  const track = (type: string, stepNo?: number, props?: Record<string, unknown>) => trackJoinEvent(sessionToken, { type, step: stepNo, props });

  useEffect(() => {
    if (!sessionToken) return;
    const handler = () => step !== 4 && trackJoinEvent(sessionToken, { type: 'registration_abandoned', step });
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [sessionToken, step]);

  useEffect(() => {
    let cancelled = false;
    setLoadingClasses(true);
    fetchJoinClasses(slug)
      .then((list) => !cancelled && setClasses(list))
      .catch(() => !cancelled && setClasses([]))
      .finally(() => !cancelled && setLoadingClasses(false));
    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    if (!qr) return;
    let cancelled = false;
    fetchQrPrefill(slug, qr)
      .then((prefill) => {
        if (cancelled || !prefill) return;
        setChild((c) => ({
          ...c,
          firstName: prefill.firstName || c.firstName,
          surname: prefill.surname || c.surname,
          classId: prefill.classId || c.classId,
        }));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [slug, qr]);

  const suggestedClasses = useMemo(() => suggestClasses(classes, child.dob), [classes, child.dob]);

  const uploadPhoto = async (file: File) => {
    if (!sessionToken) return setError(MISSING_SESSION);
    setError('');
    if (isPhotoTooLarge(file)) return setError('Photo is too large (max 2MB).');
    setPhoto({ uploading: true, url: null });
    try {
      setPhoto({ uploading: false, url: await uploadJoinPhoto(sessionToken, file) });
    } catch {
      setPhoto({ uploading: false, url: null });
      setError('Failed to upload photo. You can continue without it.');
    }
  };

  const submit = async () => {
    if (!sessionToken) return setError(MISSING_SESSION);
    setSubmitting(true);
    setError('');
    try {
      setSuccess(await registerViaQr(sessionToken, parent, child, popiaConsent, photo.url));
      track('registration_step_completed', 4);
      setStep(4);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Registration failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const next = () => {
    setError('');
    if (step === 1) {
      if (!parent.name.trim() || !parent.mobile.trim() || !parent.email.trim()) return setError('Please fill in your name, mobile, and email.');
      track('registration_step_completed', 1);
      setStep(2);
    } else if (step === 2) {
      if (!child.firstName.trim() || !child.surname.trim() || !child.dob || !child.classId) return setError('Please complete child details (including class).');
      track('registration_step_completed', 2, { classId: child.classId });
      setStep(3);
    } else if (step === 3) {
      if (!popiaConsent) return setError('POPIA consent is required.');
      track('registration_step_completed', 3, { hasPhoto: Boolean(photo.url) });
      void submit();
    }
  };

  const back = () => {
    setError('');
    if (step === 2 || step === 3) setStep((step - 1) as 1 | 2);
  };

  return {
    step,
    error,
    submitting,
    parent,
    setParent,
    child,
    setChild,
    loadingClasses,
    suggestedClasses,
    popiaConsent,
    setPopiaConsent,
    photo,
    uploadPhoto,
    success,
    next,
    back,
  };
}

export type JoinRegistration = ReturnType<typeof useJoinRegistration>;
