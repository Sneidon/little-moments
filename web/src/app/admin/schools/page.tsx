'use client';

import { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { PageHero, SectionCard, TableSkeleton } from '@/components/ui';
import type { School } from 'shared/types';
import { EditSchoolForm } from './components/EditSchoolForm';
import { InvitePrincipalForm } from './components/InvitePrincipalForm';
import { SchoolsTable } from './components/SchoolsTable';

export default function SchoolsPage() {
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [editing, setEditing] = useState<School | null>(null);

  useEffect(() => {
    getDocs(collection(db, 'schools'))
      .then((snap) => setSchools(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as School)))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="animate-fade-in">
      <PageHero
        variant="full"
        title={<span className="text-gradient-warm">Schools</span>}
        subtitle="Create and manage schools"
        actions={
          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setShowInvite(true);
            }}
            className="btn-primary"
          >
            Invite school
          </button>
        }
      />
      {showInvite && <InvitePrincipalForm onClose={() => setShowInvite(false)} />}
      {editing && (
        <EditSchoolForm
          key={editing.id}
          school={editing}
          onCancel={() => setEditing(null)}
          onSaved={(updates) => {
            setSchools((prev) => prev.map((s) => (s.id === editing.id ? { ...s, ...updates } : s)));
            setEditing(null);
          }}
        />
      )}
      <SectionCard topBar="accent" padding="none">
        {loading ? (
          <TableSkeleton rows={6} cols={6} />
        ) : (
          <SchoolsTable
            schools={schools}
            onEdit={(s) => {
              setShowInvite(false);
              setEditing(s);
            }}
          />
        )}
      </SectionCard>
    </div>
  );
}
