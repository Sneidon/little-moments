'use client';

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useMealOptions } from '@/hooks/useMealOptions';
import { useMealOptionForm } from '@/hooks/useMealOptionForm';
import { MealOptionForm } from '@/components/MealOptionForm';
import { MealOptionsTable } from '@/components/MealOptionsTable';
import { PageHero, SectionCard, TableSkeleton } from '@/components/ui';

export default function FoodMenusPage() {
  const { profile } = useAuth();
  const schoolId = profile?.schoolId;
  const { options, optionsByCategory, loading } = useMealOptions(schoolId);
  const form = useMealOptionForm({
    schoolId,
    options,
    optionsByCategory,
  });

  return (
    <div className="animate-fade-in">
      <PageHero
        variant="full"
        title={<span className="text-gradient-warm">Meal options</span>}
        subtitle="Define options for breakfast, lunch and snacks. Teachers will select from this list when logging meals."
        actions={
          <Link
            href="/principal/food-menus/weekly"
            className="btn-secondary shrink-0"
          >
            Weekly menu
          </Link>
        }
      />

      {form.showForm && <MealOptionForm form={form} />}

      {loading ? (
        <SectionCard topBar="accent" padding="none">
          <TableSkeleton />
        </SectionCard>
      ) : (
        <MealOptionsTable
          options={options}
          onEdit={form.startEdit}
          onDelete={form.deleteOption}
          onAddOption={form.startAdd}
        />
      )}
    </div>
  );
}
