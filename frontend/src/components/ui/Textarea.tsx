import type { ComponentPropsWithRef } from 'react';
import { FIELD_CONTROL_CLASS } from './field-styles';

export default function Textarea({ className = '', rows = 3, ...props }: ComponentPropsWithRef<'textarea'>) {
  return <textarea {...props} rows={rows} className={`${FIELD_CONTROL_CLASS} resize-y ${className}`} />;
}
