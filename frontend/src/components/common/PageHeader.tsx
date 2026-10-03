import type { ReactNode } from 'react';

export default function PageHeader({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
      <div><h1 className="text-2xl font-semibold tracking-tight text-primary">{title}</h1><p className="mt-2 text-sm leading-6 text-secondary">{description}</p></div>
      {action}
    </div>
  );
}
