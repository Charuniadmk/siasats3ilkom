import type { ReactNode } from 'react';

interface FormFieldProps {
  id: string;
  label: string;
  error?: string;
  children: ReactNode;
}

export default function FormField({ id, label, error, children }: FormFieldProps) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-semibold text-primary">{label}</label>
      {children}
      {error && <p id={`${id}-error`} role="alert" className="mt-2 text-xs text-error">{error}</p>}
    </div>
  );
}
