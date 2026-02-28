import { useEffect, useState } from 'react';
import { useRoute } from '@react-navigation/native';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import type { Child } from '../../../../shared/types';

type EditChildParams = { childId?: string; schoolId?: string };

export function useEditChildProfileParams(): { child: Child | null; schoolId: string | null } {
  const route = useRoute();
  const params = route.params as EditChildParams | undefined;
  const childId = params?.childId;
  const schoolId = params?.schoolId ?? null;
  const [child, setChild] = useState<Child | null>(null);

  useEffect(() => {
    if (!schoolId || !childId) {
      setChild(null);
      return;
    }
    (async () => {
      const snap = await getDoc(doc(db, 'schools', schoolId, 'children', childId));
      if (snap.exists()) {
        setChild({ id: snap.id, ...snap.data() } as Child);
      } else {
        setChild(null);
      }
    })();
  }, [schoolId, childId]);

  return { child, schoolId };
}
