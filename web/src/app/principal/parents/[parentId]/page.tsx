'use client';

import { useAuth } from '@/context/AuthContext';
import { useParams } from 'next/navigation';
import { useParentDetail } from '@/hooks/useParentDetail';
import { ParentDetailHeader, ParentProfileCard, LinkedChildrenList } from './components';

export default function ParentDetailPage() {
  const { profile } = useAuth();
  const params = useParams();
  const parentId = params?.parentId as string;
  const { parent, children, classes, loading } = useParentDetail(profile?.schoolId, parentId);

  if (loading || !parent) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <ParentDetailHeader parent={parent} childrenCount={children.length} />
      <ParentProfileCard parent={parent} />
      <div className="mt-8">
        <LinkedChildrenList children={children} classes={classes} />
      </div>
    </div>
  );
}
