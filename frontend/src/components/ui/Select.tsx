import { useEffect, useId, useRef, useState, type AriaAttributes, type FocusEventHandler, type KeyboardEvent, type Ref } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { FIELD_CONTROL_CLASS } from './field-styles';

export interface SelectOption { value: string; label: string; disabled?: boolean }
export interface SelectProps extends AriaAttributes {
  id?: string;
  name?: string;
  value: string;
  options: readonly SelectOption[];
  onValueChange: (value: string) => void;
  onBlur?: FocusEventHandler<HTMLButtonElement>;
  ref?: Ref<HTMLButtonElement>;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export default function Select({ id, name, value, options, onValueChange, onBlur, ref, placeholder = 'Pilih opsi', disabled, className = '', ...aria }: SelectProps) {
  const uid = useId();
  const listId = `${uid}-options`;
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [position, setPosition] = useState({ left: 0, top: 0, width: 0, maxHeight: 240 });
  const typed = useRef({ text: '', time: 0 });
  const selected = options.find((option) => option.value === value);
  const enabled = options.map((option, index) => option.disabled ? -1 : index).filter((index) => index >= 0);

  const show = (last = false) => {
    if (disabled || !enabled.length || !trigger.current) return;
    const rect = trigger.current.getBoundingClientRect();
    const below = window.innerHeight - rect.bottom - 12;
    const above = rect.top - 12;
    const height = Math.min(240, options.length * 40 + 8);
    const useAbove = below < height && above > below;
    const maxHeight = Math.max(44, Math.min(height, useAbove ? above : below));
    setPosition({ left: Math.max(8, Math.min(rect.left, window.innerWidth - rect.width - 8)), top: useAbove ? rect.top - maxHeight - 6 : rect.bottom + 6, width: rect.width, maxHeight });
    const selectedIndex = options.findIndex((option) => option.value === value && !option.disabled);
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : last ? enabled[enabled.length - 1] : enabled[0]);
    setOpen(true);
  };

  useEffect(() => {
    if (!open || disabled) return;
    const popup = menu.current;
    popup?.showPopover();
    const dismiss = (event: PointerEvent) => {
      if (!trigger.current?.contains(event.target as Node) && !popup?.contains(event.target as Node)) setOpen(false);
    };
    const resize = () => setOpen(false);
    const scroll = (event: Event) => {
      if (popup?.contains(event.target as Node)) return;
      const rect = trigger.current?.getBoundingClientRect();
      if (!rect) return;
      if (rect.bottom < 0 || rect.top > window.innerHeight) { setOpen(false); return; }
      setPosition(() => {
        const below = window.innerHeight - rect.bottom - 12;
        const above = rect.top - 12;
        const height = Math.min(240, popup?.scrollHeight ?? 240);
        const useAbove = below < height && above > below;
        const maxHeight = Math.max(44, Math.min(height, useAbove ? above : below));
        return { left: Math.max(8, Math.min(rect.left, window.innerWidth - rect.width - 8)), top: useAbove ? rect.top - maxHeight - 6 : rect.bottom + 6, width: rect.width, maxHeight };
      });
    };
    document.addEventListener('pointerdown', dismiss);
    window.addEventListener('resize', resize);
    window.addEventListener('scroll', scroll, true);
    return () => {
      popup?.hidePopover();
      document.removeEventListener('pointerdown', dismiss);
      window.removeEventListener('resize', resize);
      window.removeEventListener('scroll', scroll, true);
    };
  }, [open, disabled]);

  useEffect(() => {
    if (open) document.getElementById(`${listId}-${activeIndex}`)?.scrollIntoView({ block: 'nearest' });
  }, [open, activeIndex, listId]);

  const choose = (index: number) => {
    if (!options[index] || options[index].disabled) return;
    setOpen(false);
    onValueChange(options[index].value);
    trigger.current?.focus();
  };
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Tab') { setOpen(false); return; }
    if (event.key === 'Escape' && open) { event.preventDefault(); event.stopPropagation(); setOpen(false); return; }
    if (['ArrowDown', 'ArrowUp', 'Home', 'End', 'Enter', ' '].includes(event.key)) {
      event.preventDefault();
      if (!open) { show(event.key === 'ArrowUp' || event.key === 'End'); return; }
      if (event.key === 'Enter' || event.key === ' ') { choose(activeIndex); return; }
      const current = enabled.indexOf(activeIndex);
      setActiveIndex(event.key === 'Home' ? enabled[0] : event.key === 'End' ? enabled[enabled.length - 1] : enabled[(current + (event.key === 'ArrowUp' ? -1 : 1) + enabled.length) % enabled.length]);
      return;
    }
    if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      const now = Date.now();
      typed.current = { text: (now - typed.current.time < 700 ? typed.current.text : '') + event.key.toLocaleLowerCase('id-ID'), time: now };
      const match = options.findIndex((option) => !option.disabled && option.label.toLocaleLowerCase('id-ID').startsWith(typed.current.text));
      if (match >= 0) { if (!open) show(); setActiveIndex(match); }
    }
  };

  return <div className={`relative min-w-0 ${className}`}>
    {name && <input type="hidden" name={name} value={value} disabled={disabled} />}
    <button {...aria} id={id} ref={(element) => {
      trigger.current = element;
      if (typeof ref === 'function') ref(element);
      else if (ref) ref.current = element;
    }} type="button" role="combobox" aria-haspopup="listbox" aria-expanded={open && !disabled} aria-controls={listId} aria-activedescendant={open ? `${listId}-${activeIndex}` : undefined} disabled={disabled} onBlur={onBlur} onClick={() => open ? setOpen(false) : show()} onKeyDown={onKeyDown} className={`${FIELD_CONTROL_CLASS} flex items-center justify-between gap-3 text-left`}>
      <span className={`truncate ${!selected ? 'text-slate-400' : ''}`}>{selected?.label ?? placeholder}</span><ChevronDown size={16} aria-hidden="true" className={`shrink-0 text-secondary transition-transform ${open ? 'rotate-180' : ''}`} />
    </button>
    <div ref={menu} popover="manual" id={listId} role="listbox" aria-label={aria['aria-label'] ?? 'Pilihan'} style={{ left: position.left, top: position.top, width: position.width, maxHeight: position.maxHeight }} className="fixed inset-auto m-0 overflow-y-auto rounded-lg border border-border bg-white p-1 text-sm text-primary shadow-lg" onPointerDown={(event) => event.preventDefault()}>
      {options.map((option, index) => <div key={option.value} id={`${listId}-${index}`} role="option" aria-selected={value === option.value} aria-disabled={option.disabled || undefined} onClick={() => choose(index)} onPointerMove={() => { if (!option.disabled) setActiveIndex(index); }} className={`flex min-h-10 cursor-pointer items-center justify-between gap-3 rounded-md px-3 py-2 ${option.disabled ? 'cursor-not-allowed text-slate-400' : activeIndex === index ? 'bg-blue-50 text-accent' : 'hover:bg-surface'} ${value === option.value ? 'font-medium text-accent' : ''}`}>
        <span>{option.label}</span>{value === option.value && <Check size={16} aria-hidden="true" className="shrink-0" />}
      </div>)}
    </div>
  </div>;
}
