import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useOpenChat, NO_PARENTS_ALERT, useTeacherClassChildren } from '../../hooks';
import { EmptyCard } from '../../components/brand/EmptyCard';
import { ChildPickerList, type PickableChild } from '../../features/chat/ChildPickerList';

export function SelectChildToMessageScreen() {
  const { profile } = useAuth();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const { children, classes, loading } = useTeacherClassChildren(refreshTrigger);
  const { openChat, openingChildId } = useOpenChat({ replace: true });

  useEffect(() => {
    if (!loading) setRefreshing(false);
  }, [loading, children]);

  const items = useMemo<PickableChild[]>(() => {
    const classNames = new Map(classes.map((c) => [c.id, c.name]));
    return [...children]
      .sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '', undefined, { sensitivity: 'base' }))
      .map((child) => {
        const enabled = !!child.parentIds?.length;
        const className = child.classId ? classNames.get(child.classId) : undefined;
        return { child, enabled, subtitle: enabled ? className || 'Parent linked' : 'No parent linked' };
      });
  }, [children, classes]);

  return (
    <ChildPickerList
      items={items}
      loading={loading && children.length === 0}
      refreshing={refreshing}
      onRefresh={() => {
        setRefreshing(true);
        setRefreshTrigger((t) => t + 1);
      }}
      openingChildId={openingChildId}
      onSelect={(child) =>
        openChat({
          schoolId: profile?.schoolId,
          childId: child.id,
          otherParticipantId: child.parentIds?.[0],
          missingTitle: 'No parent linked',
          missingMessage: NO_PARENTS_ALERT.missingMessage,
        })
      }
      empty={
        classes.length === 0 ? (
          <EmptyCard
            icon="school-outline"
            title="No classes assigned"
            body="When you’re assigned to a class, children in that class will show up here."
          />
        ) : (
          <EmptyCard icon="people-outline" title="No children yet" body="There are no children in your classes yet." />
        )
      }
    />
  );
}
