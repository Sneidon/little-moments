import { ParentNotificationPrefKey } from './recipients';

export function reportTypeToNotificationPrefKey(reportType: string | undefined): ParentNotificationPrefKey | null {
  switch (reportType) {
    case 'nappy_change':
      return 'nappyChange';
    case 'nap_time':
      return 'napTime';
    case 'meal':
      return 'meal';
    case 'check_in':
      return 'checkIn';
    case 'check_out':
      return 'checkOut';
    case 'activity':
    case 'class_change':
      return 'activity';
    case 'medication':
      return 'medication';
    case 'incident':
      return 'incident';
    default:
      return null;
  }
}

function formatMealCategoryLabel(mealType?: string | null): string | null {
  if (!mealType || typeof mealType !== 'string') return null;
  const key = mealType.trim().toLowerCase();
  const labels: Record<string, string> = { breakfast: 'Breakfast', lunch: 'Lunch', snack: 'Snack' };
  if (labels[key]) return labels[key];
  const t = mealType.trim();
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : null;
}

export function buildReportNotificationCopy(
  report: {
    type?: string;
    notes?: string;
    mealType?: string;
    mealOptionName?: string;
    photoCategory?: string;
  },
  childName: string
): { title: string; body: string } {
  const type = report.type;
  const shortNotes = report.notes && String(report.notes).trim()
    ? String(report.notes).trim().slice(0, 100)
    : '';
  if (type === 'meal') {
    const category = formatMealCategoryLabel(report.mealType);
    const option = report.mealOptionName && String(report.mealOptionName).trim() ? String(report.mealOptionName).trim() : '';
    const titleMeal = category || option || 'Meal';
    const body =
      option && category
        ? option
        : shortNotes || 'New meal update from school.';
    return {
      title: `${childName}: ${titleMeal}`,
      body,
    };
  }
  if (type === 'nap_time') {
    return {
      title: `${childName}: Nap time`,
      body: shortNotes || 'Sleep update logged.',
    };
  }
  if (type === 'nappy_change') {
    return {
      title: `${childName}: Nappy change`,
      body: shortNotes || 'Nappy update logged.',
    };
  }
  if (type === 'check_in') {
    return {
      title: `${childName}: Check in`,
      body: shortNotes || 'Checked in at school.',
    };
  }
  if (type === 'check_out') {
    return {
      title: `${childName}: Check out`,
      body: shortNotes || 'Checked out from school.',
    };
  }
  if (type === 'activity') {
    return {
      title: `${childName}: Activity`,
      body: shortNotes || 'New activity update from school.',
    };
  }
  if (type === 'class_change') {
    return {
      title: `${childName}: Class update`,
      body: shortNotes || 'Your child\'s class has been updated.',
    };
  }
  if (type === 'medication') {
    return {
      title: `${childName}: Medication`,
      body: shortNotes || 'Medication logged.',
    };
  }
  if (type === 'incident') {
    const cat = (report.photoCategory && String(report.photoCategory).trim()) || 'Photo';
    return {
      title: `${childName}: New ${cat}`,
      body: shortNotes || 'New photo or update — tap to view.',
    };
  }
  return {
    title: `${childName}: Daily update`,
    body: shortNotes || 'New update from school.',
  };
}
