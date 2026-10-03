import { useEffect, useRef, type InputHTMLAttributes } from 'react';

export default function Checkbox({ indeterminate = false, ...props }: InputHTMLAttributes<HTMLInputElement> & { indeterminate?: boolean }) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { if (ref.current) ref.current.indeterminate = indeterminate; }, [indeterminate]);
  return <input {...props} ref={ref} type="checkbox" className="size-4 cursor-pointer rounded border-border accent-accent outline-none focus-visible:ring-2 focus-visible:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-50" />;
}
