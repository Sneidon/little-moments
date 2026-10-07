'use client';

import { PageHero, ExportMenu } from '@/components/ui';

export interface ParentsPageHeaderProps {
  onExportPdf: () => void;
  onExportCsv: () => void;
  onExportExcel: () => void;
  exportDisabled: boolean;
  exporting: boolean;
}

export function ParentsPageHeader({
  onExportPdf,
  onExportCsv,
  onExportExcel,
  exportDisabled,
  exporting,
}: ParentsPageHeaderProps) {

  return (
    <PageHero
      variant="full"
      title={<span className="text-gradient-warm">Parents</span>}
      subtitle="Parents linked to children at your school. Invite and manage from each child's profile."
      actions={
      <ExportMenu
        className="relative shrink-0"
        onCsv={onExportCsv}
        onExcel={onExportExcel}
        onPdf={onExportPdf}
        disabled={exportDisabled}
        busy={exporting}
        title={exportDisabled ? 'No parents to export' : 'Export parents'}
      />
      }
    />
  );
}
