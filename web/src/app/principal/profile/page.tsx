'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { uploadUserAvatar } from '@/utils/uploadImage';
import { PageHero, SectionCard } from '@/components/ui';

const inputBase =
  'w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 min-w-0';

export default function PrincipalProfilePage() {
  const router = useRouter();
  const { profile, refreshProfile } = useAuth();
  const [displayName, setDisplayName] = useState(profile?.displayName ?? '');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(profile?.photoURL ?? null);
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName ?? '');
      setPreviewUrl(profile.photoURL ?? null);
    }
  }, [profile]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setPhotoFile(file ?? null);
    setError(null);
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(profile?.photoURL ?? null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.uid) return;
    setSubmitting(true);
    setSaved(false);
    setError(null);
    try {
      const updates: { displayName?: string; photoURL?: string; updatedAt: string } = {
        updatedAt: new Date().toISOString(),
      };
      if (displayName.trim() !== (profile.displayName ?? '')) {
        updates.displayName = displayName.trim();
      }
      if (photoFile) {
        updates.photoURL = await uploadUserAvatar(photoFile, profile.uid);
      }
      await updateDoc(doc(db, 'users', profile.uid), updates);
      await refreshProfile();
      setSaved(true);
      setPhotoFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSubmitting(false);
    }
  };

  if (!profile) return null;

  return (
    <div className="animate-fade-in">
      <PageHero
        variant="full"
        title={<span className="text-gradient-warm">My profile</span>}
        subtitle="Update your name and profile picture"
        backHref="/principal"
        backLabel="Dashboard"
      />
      <SectionCard topBar="accent" padding="default">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200">
              {error}
            </p>
          )}
          {saved && (
            <p className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800 dark:border-green-800 dark:bg-green-950/40 dark:text-green-200">
              Profile saved.
            </p>
          )}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Profile picture
            </label>
            <div className="flex flex-wrap items-center gap-4">
              <div className="h-20 w-20 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-600 dark:bg-slate-700">
                {previewUrl ? (
                  <img src={previewUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-2xl font-semibold text-slate-400">
                    {(profile.displayName || profile.email || '?').slice(0, 2).toUpperCase()}
                  </div>
                )}
              </div>
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="hidden"
                  aria-label="Choose profile photo"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="btn-secondary text-sm"
                >
                  {photoFile ? 'Change photo' : 'Upload photo'}
                </button>
                {photoFile && (
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{photoFile.name}</p>
                )}
              </div>
            </div>
          </div>
          <div>
            <label htmlFor="profile-displayName" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Display name
            </label>
            <input
              id="profile-displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className={inputBase}
              placeholder="Your name"
            />
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? 'Saving…' : 'Save'}
            </button>
            <button type="button" onClick={() => router.push('/principal')} className="btn-secondary">
              Cancel
            </button>
          </div>
        </form>
      </SectionCard>
    </div>
  );
}
