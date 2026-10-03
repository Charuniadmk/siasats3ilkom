import type { Ref } from 'react';
import DatePicker, { type DatePickerProps } from './DatePicker';

export interface InputDateProps extends Omit<DatePickerProps, 'inputRef'> {
  ref?: Ref<HTMLInputElement>;
}

export default function InputDate({ ref, ...props }: InputDateProps) {
  return <DatePicker {...props} inputRef={ref} />;
}
