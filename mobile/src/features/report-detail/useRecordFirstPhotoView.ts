import { useEffect } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import app from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';

type Params = { schoolId: string; childId: string; reportId: string };

export function useRecordFirstPhotoView(params: Params, imageUrl: string | undefined) {
  const { profile } = useAuth();
  const isActiveParent = profile?.role === 'parent' && (profile as { parentStatus?: string }).parentStatus === 'ACTIVE';
  const { schoolId, childId, reportId } = params;

  useEffect(() => {
    if (!isActiveParent || !imageUrl) return;
    httpsCallable(getFunctions(app), 'recordFirstPhotoViewed')({ schoolId, childId, reportId }).catch(() => {});
  }, [isActiveParent, imageUrl, schoolId, childId, reportId]);
}
