'use client';

export interface SectionHeadingProps {
  children: React.ReactNode;
  className?: string;
}

export function SectionHeading({ children, className = '' }: SectionHeadingProps) {
  return (
    <h2 className={`heading-daycare mb-4 text-lg ${className}`}>
      {children}
    </h2>
  );
}
