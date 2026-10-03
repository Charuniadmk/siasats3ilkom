import { useState, type Ref } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import Modal from './Modal';
import Input from './Input';
import Select from './Select';

import { todayInJakarta } from '../../utils/date';

const months = Array.from({ length: 12 }, (_, month) => new Intl.DateTimeFormat('id-ID', { month: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(2000, month, 1))));
const weekdays = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
const toIsoDate = (year: number, month: number, day: number) => `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

export interface DatePickerProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  inputRef?: Ref<HTMLInputElement>;
  disabled?: boolean;
  min?: string;
  max?: string;
  invalid?: boolean;
  describedBy?: string;
  label?: string;
}

export default function DatePicker({ id, value, onChange, onBlur, inputRef, disabled, min = '1900-01-01', max = '2100-12-31', invalid, describedBy, label = 'Pilih tanggal' }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const initial = value || (todayInJakarta() > max ? max : todayInJakarta() < min ? min : todayInJakarta());
  const [view, setView] = useState({ year: Number(initial.slice(0, 4)), month: Number(initial.slice(5, 7)) - 1 });
  const firstYear = Number(min.slice(0, 4));
  const lastYear = Number(max.slice(0, 4));
  const startOffset = (new Date(Date.UTC(view.year, view.month, 1)).getUTCDay() + 6) % 7;
  const days = new Date(Date.UTC(view.year, view.month + 1, 0)).getUTCDate();
  const display = value ? new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`)) : '';
  const close = () => { setOpen(false); onBlur?.(); };
  const show = () => { if (disabled) return; setView({ year: Number(initial.slice(0, 4)), month: Number(initial.slice(5, 7)) - 1 }); setOpen(true); };
  const moveMonth = (offset: number) => { const date = new Date(Date.UTC(view.year, view.month + offset, 1)); setView({ year: date.getUTCFullYear(), month: date.getUTCMonth() }); };
  return <>
    <Input id={id} ref={inputRef} type="text" readOnly value={display} onClick={show} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') { event.preventDefault(); show(); } }} onBlur={onBlur} disabled={disabled} placeholder="Pilih tanggal" aria-invalid={invalid} aria-describedby={describedBy} aria-haspopup="dialog" aria-expanded={open} className="cursor-pointer" trailingContent={<button type="button" aria-label={label} onClick={show} disabled={disabled} className="flex size-10 items-center justify-center rounded-md text-secondary hover:text-accent disabled:cursor-not-allowed"><CalendarDays size={19} aria-hidden="true" /></button>} />
    {open && <Modal title={label} onClose={close}>
      <div className="flex items-center gap-2">
        <button type="button" aria-label="Bulan sebelumnya" disabled={toIsoDate(view.year, view.month, 1).slice(0, 7) <= min.slice(0, 7)} onClick={() => moveMonth(-1)} className="rounded-lg p-2 hover:bg-surface disabled:opacity-30"><ChevronLeft size={18} /></button>
        <Select aria-label="Pilih bulan" value={String(view.month)} onValueChange={(value) => setView((previous) => ({ ...previous, month: Number(value) }))} className="flex-1" options={months.map((month, index) => ({ value: String(index), label: month, disabled: toIsoDate(view.year, index, 1).slice(0, 7) < min.slice(0, 7) || toIsoDate(view.year, index, 1).slice(0, 7) > max.slice(0, 7) }))} />
        <Select aria-label="Pilih tahun" value={String(view.year)} onValueChange={(value) => setView((previous) => ({ ...previous, year: Number(value) }))} className="w-24 shrink-0" options={Array.from({ length: lastYear - firstYear + 1 }, (_, index) => lastYear - index).map((year) => ({ value: String(year), label: String(year) }))} />
        <button type="button" aria-label="Bulan selanjutnya" disabled={toIsoDate(view.year, view.month, 1).slice(0, 7) >= max.slice(0, 7)} onClick={() => moveMonth(1)} className="rounded-lg p-2 hover:bg-surface disabled:opacity-30"><ChevronRight size={18} /></button>
      </div>
      <div className="mt-5 grid grid-cols-7 gap-1">
        {weekdays.map((day) => <span key={day} className="py-2 text-center text-xs text-secondary">{day}</span>)}
        {Array.from({ length: startOffset }, (_, index) => <span key={`empty-${index}`} />)}
        {Array.from({ length: days }, (_, index) => index + 1).map((day) => {
          const date = toIsoDate(view.year, view.month, day);
          const dateLabel = new Intl.DateTimeFormat('id-ID', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`));
          return <button key={day} type="button" aria-label={dateLabel} aria-pressed={value === date} disabled={date < min || date > max} onClick={() => { onChange(date); close(); }} className={`rounded-lg py-3 text-sm disabled:opacity-25 ${value === date ? 'bg-accent text-white' : 'hover:bg-blue-50 hover:text-accent'}`}>{day}</button>;
        })}
      </div>
      <div className="mt-5 flex justify-between border-t border-border pt-4"><button type="button" onClick={() => { onChange(''); close(); }} className="text-sm text-secondary">Kosongkan tanggal</button><button type="button" onClick={close} className="text-sm font-medium text-accent">Batal</button></div>
    </Modal>}
  </>;
}
