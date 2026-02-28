'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { LoadingScreen } from '@/components/LoadingScreen';
import type { School, SchoolFeatures } from 'shared/types';

const FEATURE_KEYS: (keyof SchoolFeatures)[] = [
  'nappyChange',
  'napTime',
  'meal',
  'medication',
  'incident',
  'media',
];

const FEATURE_LABELS: Record<keyof SchoolFeatures, string> = {
  nappyChange: 'Nappy change tracking',
  napTime: 'Nap time tracking',
  meal: 'Eating pattern monitoring',
  medication: 'Medication administration',
  incident: 'Illness or incident reporting',
  media: 'Upload media',
};

export default function AdminSchoolSettingsPage() {
  const params = useParams();
  const schoolId = typeof params?.schoolId === 'string' ? params.schoolId : undefined;
  const [school, setSchool] = useState<School | null>(null);
  const [features, setFeatures] = useState<SchoolFeatures>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!schoolId) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'schools', schoolId));
        if (!snap.exists()) {
          setError('School not found');
          return;
        }
        const data = { id: snap.id, ...snap.data() } as School;
        setSchool(data);
        setFeatures(data.features ?? {});
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    })();
  }, [schoolId]);

  const toggleFeature = (key: keyof SchoolFeatures) => {
    const current = features[key];
    setFeatures((prev) => ({
      ...prev,
      [key]: current === false ? undefined : false,
    }));
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolId) return;
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const normalized: SchoolFeatures = {};
      for (const k of FEATURE_KEYS) {
        const v = features[k];
        if (v === false) normalized[k] = false;
        else normalized[k] = true;
      }
      await updateDoc(doc(db, 'schools', schoolId), {
        features: normalized,
        updatedAt: new Date().toISOString(),
      });
      setSchool((prev) => (prev ? { ...prev, features: normalized } : null));
      setFeatures(normalized);
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading && !school) {
    return <LoadingScreen message="Loading…" variant="primary" />;
  }

  if (error || !school) {
    return (
      <div className="animate-fade-in">
        <Link
          href="/admin/schools"
          className="text-primary-600 dark:text-primary-400 hover:underline text-sm font-medium"
        >
          ← Back to schools
        </Link>
        <div className="mt-6 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 p-6">
          <p className="text-slate-600 dark:text-slate-300">{error ?? 'School not found'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <Link
          href={`/admin/schools/${schoolId}`}
          className="text-primary-600 dark:text-primary-400 hover:underline text-sm font-medium"
        >
          ← Back to {school.name}
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Configure school
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Enable or disable features for this school. Disabled features will be hidden from teachers.
        </p>
      </div>

      <form onSubmit={save} className="card p-6">
        <h2 className="mb-4 text-lg font-semibold text-slate-800 dark:text-slate-200">Feature flags</h2>
        <div className="space-y-3">
          {FEATURE_KEYS.map((key) => (
            <div
              key={key}
              className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-600 px-4 py-3"
            >
              <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                {FEATURE_LABELS[key]}
              </span>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={features[key] !== false}
                  onChange={() => toggleFeature(key)}
                  className="peer sr-only"
                />
                <div className="peer h-6 w-11 rounded-full bg-slate-200 dark:bg-slate-600 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-slate-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-primary-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none dark:bg-slate-600 dark:after:border-slate-500" />
              </label>
            </div>
          ))}
        </div>
        <div className="mt-6 flex items-center gap-3">
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Saving…' : 'Save changes'}
          </button>
          {saved && (
            <span className="text-sm font-medium text-green-600 dark:text-green-400">Saved</span>
          )}
          {error && (
            <span className="text-sm font-medium text-red-600 dark:text-red-400">{error}</span>
          )}
        </div>
      </form>
    </div>
  );
}
