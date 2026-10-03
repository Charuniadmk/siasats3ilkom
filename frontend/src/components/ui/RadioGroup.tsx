import type { ReactNode } from 'react';

interface RadioGroupProps<T extends string> {
  name: string;
  label: string;
  value: T;
  onValueChange: (value: T) => void;
  options: readonly { value: T; label: string; icon?: ReactNode }[];
  disabled?: boolean;
}

export default function RadioGroup<T extends string>({ name, label, value, onValueChange, options, disabled }: RadioGroupProps<T>) {
  return <fieldset disabled={disabled}>
    <legend className="sr-only">{label}</legend>
    <div className="flex gap-1 rounded-xl border border-border bg-surface p-1">
      {options.map((option) => <label key={option.value} className={`relative flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors has-focus-visible:outline-2 has-focus-visible:outline-accent ${value === option.value ? 'bg-white text-accent shadow-sm' : 'text-secondary hover:text-primary'}`}>
        <input type="radio" name={name} value={option.value} checked={value === option.value} onChange={() => onValueChange(option.value)} className="absolute inset-0 size-full cursor-pointer opacity-0 disabled:cursor-not-allowed" />
        {option.icon}{option.label}
      </label>)}
    </div>
  </fieldset>;
}
