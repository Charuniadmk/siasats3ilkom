import { z } from 'zod';
import { todayInJakarta } from '../../utils/date';

export const studentProfileSchema = z.object({
  nim: z.string().trim().min(1, 'NIM wajib diisi.').max(32, 'NIM maksimal 32 karakter.').regex(/^\d+$/, 'NIM hanya boleh berisi angka.'),
  fullName: z.string().trim().min(1, 'Nama lengkap wajib diisi.').max(150, 'Nama lengkap maksimal 150 karakter.'),
  gender: z.enum(['MALE', 'FEMALE'], { error: 'Silakan pilih jenis kelamin.' }),
  address: z.string().trim().min(1, 'Alamat wajib diisi.').max(1000, 'Alamat maksimal 1000 karakter.'),
  birthDate: z.string().min(1, 'Tanggal lahir wajib diisi.').pipe(z.iso.date({ error: 'Tanggal lahir tidak valid.' })).refine((value) => value >= '1900-01-01' && value <= todayInJakarta(), 'Tanggal lahir harus antara 1 Januari 1900 dan hari ini.'),
});
export type StudentProfileFields = z.infer<typeof studentProfileSchema>;
