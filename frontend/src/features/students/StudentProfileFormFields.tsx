import { Controller, useFormContext } from 'react-hook-form';
import FormField from '../../components/forms/FormField';
import InputDate from '../../components/ui/InputDate';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Textarea from '../../components/ui/Textarea';
import { todayInJakarta } from '../../utils/date';
import type { StudentProfileFields } from './students-schema';

export default function StudentProfileFormFields({ disabled = false }: { disabled?: boolean }) {
  const { register, control, formState: { errors } } = useFormContext<StudentProfileFields>();
  const fieldProps = (name: keyof StudentProfileFields) => ({ disabled, 'aria-invalid': Boolean(errors[name]), 'aria-describedby': errors[name] ? `student-${name}-error` : undefined });
  return <>
    <div className="grid gap-6 sm:grid-cols-2">
      <FormField id="student-nim" label="Nomor Induk Mahasiswa (NIM)" error={errors.nim?.message}><Input {...register('nim')} id="student-nim" inputMode="numeric" autoComplete="off" placeholder="Masukkan NIM mahasiswa" {...fieldProps('nim')} /></FormField>
      <FormField id="student-fullName" label="Nama Lengkap" error={errors.fullName?.message}><Input {...register('fullName')} id="student-fullName" autoComplete="name" placeholder="Masukkan nama lengkap" maxLength={150} {...fieldProps('fullName')} /></FormField>
      <FormField id="student-gender" label="Jenis Kelamin" error={errors.gender?.message}><Controller control={control} name="gender" render={({ field }) => <Select id="student-gender" name={field.name} ref={field.ref} value={field.value ?? ''} onValueChange={field.onChange} onBlur={field.onBlur} placeholder="Pilih jenis kelamin" options={[{ value: 'MALE', label: 'Laki-laki' }, { value: 'FEMALE', label: 'Perempuan' }]} {...fieldProps('gender')} />} /></FormField>
      <FormField id="student-birthDate" label="Tanggal Lahir" error={errors.birthDate?.message}><Controller control={control} name="birthDate" render={({ field }) => <InputDate id="student-birthDate" value={field.value} onChange={field.onChange} onBlur={field.onBlur} ref={field.ref} disabled={disabled} max={todayInJakarta()} label="Pilih tanggal lahir" invalid={Boolean(errors.birthDate)} describedBy={errors.birthDate ? 'student-birthDate-error' : undefined} />} /></FormField>
    </div>
    <FormField id="student-address" label="Alamat" error={errors.address?.message}><Textarea {...register('address')} id="student-address" autoComplete="street-address" placeholder="Masukkan alamat lengkap" rows={3} maxLength={1000} {...fieldProps('address')} /></FormField>
  </>;
}
