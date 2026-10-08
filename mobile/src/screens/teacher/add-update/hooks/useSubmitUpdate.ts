import { useCallback, useState } from 'react';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '../../../../config/firebase';
import { useAuth } from '../../../../context/AuthContext';
import { ineligibleSelectionMessage } from '../../../../utils/childPresence';
import { uploadMediaAsync, uploadPhotoAsync } from '../../../../utils/uploadPhoto';
import type { Child, MealOption, ReportType } from '@shared/types';
import type { UpdateFields } from '../types';
import { buildReport, validateValues } from './buildReport';
import { useFeedback } from '../../../../context/FeedbackContext';

type Args = {
  type: ReportType;
  children: Child[];
  selectedIds: string[];
  isEligible: (childId: string) => boolean;
  loadingPresence: boolean;
  valuesFor: (childId: string) => UpdateFields;
  mealOptions: MealOption[];
  media: { uri: string | null; mimeType?: string; forWholeClass: boolean };
  onDone: () => void;
};

async function uploadAttachment(uri: string, mimeType: string | undefined, schoolId: string, childId: string) {
  if (mimeType?.startsWith('video/')) {
    const { url, mediaType } = await uploadMediaAsync(uri, schoolId, childId, mimeType);
    return { url, mediaType };
  }
  return { url: await uploadPhotoAsync(uri, schoolId, childId), mediaType: undefined };
}

export function useSubmitUpdate(args: Args) {
  const { notify, withLoader } = useFeedback();
  const { profile } = useAuth();
  const [saving, setSaving] = useState(false);

  const submit = useCallback(async () => {
    const { type, children, selectedIds, isEligible, loadingPresence, valuesFor, mealOptions, media, onDone } = args;
    const schoolId = profile?.schoolId;
    const wholeClass = type === 'incident' && media.forWholeClass;
    if (!schoolId || !profile?.uid || (!wholeClass && selectedIds.length === 0)) {
      void notify({ tone: 'warning', title: 'Select children', message: 'Choose at least one child.' });
      return;
    }
    if (type === 'incident' && !media.uri) {
      void notify({ tone: 'warning', title: 'Add media', message: 'Take or choose a photo/video to log.' });
      return;
    }
    if (loadingPresence) return;
    if (selectedIds.some((id) => !isEligible(id))) {
      void notify({ tone: 'warning', title: 'Select children', message: ineligibleSelectionMessage(type) });
      return;
    }
    for (const childId of selectedIds) {
      const name = children.find((c) => c.id === childId)?.name ?? 'Child';
      const problem = validateValues(type, valuesFor(childId), name);
      if (problem) {
        void notify({ tone: 'warning', title: problem[0], message: problem[1] });
        return;
      }
    }

    const targets = wholeClass ? children.filter((c) => isEligible(c.id)).map((c) => c.id) : selectedIds;
    if (targets.length === 0) {
      void notify({ tone: 'warning', title: 'Select children', message: wholeClass ? 'No checked-in children in your class.' : 'Choose at least one child.' });
      return;
    }

    setSaving(true);
    try {
      await withLoader(async () => {
        const uploaded =
          type === 'incident' && media.uri
            ? await uploadAttachment(media.uri, media.mimeType, schoolId, targets[0])
            : { url: null, mediaType: undefined };
        const now = new Date().toISOString();
        for (const childId of targets) {
          const report = buildReport({
            type,
            childId,
            schoolId,
            reportedBy: profile.uid,
            now,
            values: valuesFor(childId),
            mealOptions,
            media: { ...uploaded, forWholeClass: wholeClass },
          });
          await addDoc(collection(db, 'schools', schoolId, 'children', childId, 'reports'), report);
        }
      }, type === 'incident' && media.uri ? 'Uploading…' : 'Saving…');
      void notify({ tone: 'success', title: 'Done', message: selectedIds.length > 1 ? `Update saved for ${selectedIds.length} children.` : 'Update saved.' });
      onDone();
    } catch (e: unknown) {
      void notify({ tone: 'error', title: 'Error', message: e instanceof Error ? e.message : 'Failed to save' });
    } finally {
      setSaving(false);
    }
  }, [args, profile?.schoolId, profile?.uid]);

  return { submit, saving };
}
