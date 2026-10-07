import { useCallback, useEffect, useState } from 'react';
import { refreshParentChildren } from '../../../api/children';
import { useAuth } from '../../../context/AuthContext';
import { fetchPhotoFeed, type PhotoFeedItem } from './photoFeed';
import type { Child } from '@shared/types';

export function usePhotoFeed() {
  const { profile } = useAuth();
  const [children, setChildren] = useState<Child[]>([]);
  const [photos, setPhotos] = useState<PhotoFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const uid = profile?.uid;
    let list: Child[] = [];
    let items: PhotoFeedItem[] = [];
    if (uid) {
      try {
        list = await refreshParentChildren(uid);
        items = await fetchPhotoFeed(list);
      } catch {
        list = [];
      }
    }
    setChildren(list);
    setPhotos(items);
    setLoading(false);
    setRefreshing(false);
  }, [profile?.uid]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void load();
  }, [load]);

  return { children, photos, loading, refreshing, onRefresh };
}
