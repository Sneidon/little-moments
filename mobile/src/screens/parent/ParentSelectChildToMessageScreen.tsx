import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useOpenChat, NO_TEACHER_ALERT } from '../../hooks';
import { fetchParentChildren, resolveChildTeacherId } from '../../api/children';
import { EmptyCard } from '../../components/brand/EmptyCard';
import { ChildPickerList, type PickableChild } from '../../features/chat/ChildPickerList';

type ChildWithTeacher = PickableChild & { teacherId: string | null };

export function ParentSelectChildToMessageScreen() {
  const { profile } = useAuth();
  const [items, setItems] = useState<ChildWithTeacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const { openChat, openingChildId } = useOpenChat();

  useEffect(() => {
    const uid = profile?.uid;
    if (!uid) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const children = await fetchParentChildren(uid);
      const withTeachers = await Promise.all(
        children.map(async (child) => {
          const teacherId = await resolveChildTeacherId(child);
          return {
            child,
            teacherId,
            enabled: !!teacherId,
            subtitle: teacherId ? 'Tap to message teacher' : 'Teacher not assigned yet',
          };
        })
      );
      if (cancelled) return;
      setItems(withTeachers);
      setLoading(false);
      setRefreshing(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [profile?.uid, refreshTrigger]);

  return (
    <ChildPickerList
      items={items}
      loading={loading}
      refreshing={refreshing}
      onRefresh={() => {
        setRefreshing(true);
        setRefreshTrigger((t) => t + 1);
      }}
      openingChildId={openingChildId}
      onSelect={(child) => {
        const item = items.find((i) => i.child.id === child.id);
        void openChat({ schoolId: child.schoolId, childId: child.id, otherParticipantId: item?.teacherId, ...NO_TEACHER_ALERT });
      }}
      empty={<EmptyCard icon="people-outline" title="No children linked" body="Ask your school to link your child to your parent account." />}
    />
  );
}
