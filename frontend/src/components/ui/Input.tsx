import type { ComponentPropsWithRef, ReactNode } from 'react';
import { FIELD_CONTROL_CLASS } from './field-styles';

export interface InputProps extends ComponentPropsWithRef<'input'> {
  leadingIcon?: ReactNode;
  trailingContent?: ReactNode;
}

export default function Input({ leadingIcon, trailingContent, className = '', ...props }: InputProps) {
  const input = <input {...props} className={`${FIELD_CONTROL_CLASS} ${leadingIcon ? 'pl-11' : ''} ${trailingContent ? 'pr-12' : ''} ${className}`} />;
  if (!leadingIcon && !trailingContent) return input;
  return <div className="relative w-full">
    {leadingIcon && <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-secondary">{leadingIcon}</span>}
    {input}
    {trailingContent && <span className="absolute inset-y-0 right-1 flex items-center">{trailingContent}</span>}
  </div>;
}
