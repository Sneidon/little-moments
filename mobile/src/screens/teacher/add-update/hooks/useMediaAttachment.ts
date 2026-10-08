import { useCallback, useEffect, useState } from 'react';
import { pickPhotoAsync, pickVideoAsync, showMediaSourceAlert, takePhotoAsync, takeVideoAsync } from '../../../../utils/photoPicker';

type PickResult = { uri: string; mimeType?: string } | null;

export function useMediaAttachment(childCount: number) {
  const [uri, setUri] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string | undefined>(undefined);
  const [forWholeClass, setForWholeClass] = useState(false);

  useEffect(() => {
    if (childCount === 0) setForWholeClass(false);
  }, [childCount]);

  const attach = useCallback(
    (picker: () => Promise<PickResult>, kind: 'photo' | 'video') => async () => {
      const result = await picker();
      if (!result) return;
      setUri(result.uri);
      setMimeType(kind === 'photo' ? 'image/jpeg' : result.mimeType ?? 'video/mp4');
    },
    []
  );

  const pick = useCallback(() => {
    showMediaSourceAlert(
      attach(takePhotoAsync, 'photo'),
      attach(takeVideoAsync, 'video'),
      attach(pickPhotoAsync, 'photo'),
      attach(pickVideoAsync, 'video')
    );
  }, [attach]);

  const remove = useCallback(() => {
    setUri(null);
    setMimeType(undefined);
  }, []);

  return {
    uri,
    mimeType,
    isVideo: mimeType?.startsWith('video/') ?? false,
    pick,
    remove,
    forWholeClass,
    setForWholeClass,
  };
}
