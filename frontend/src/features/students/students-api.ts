import { api } from '../../lib/api';

export interface StudentAccount {
  id: string;
  nim: string;
  fullName: string | null;
  gender: 'MALE' | 'FEMALE' | null;
  address: string | null;
  birthDate: string | null;
  createdAt: string;
}

export interface StudentList {
  success: true;
  data: StudentAccount[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export const studentsQueryKey = ['students'] as const;

export interface StudentListParams {
  page: number;
  limit: number;
  search: string;
  sortBy: 'nim' | 'fullName' | 'createdAt';
  sortOrder: 'asc' | 'desc';
  dateFrom?: string;
  dateTo?: string;
}

export async function listStudents(params: StudentListParams, signal?: AbortSignal) {
  const { data } = await api.get<StudentList>('/students', { params, signal });
  return data;
}

export interface StudentProfileInput {
  nim: string;
  fullName: string;
  gender: 'MALE' | 'FEMALE';
  address: string;
  birthDate: string;
}

export async function updateStudent(id: string, input: { nim: string; password?: string } & Partial<Omit<StudentProfileInput, 'nim'>>) {
  const { data } = await api.patch<{ success: true; message: string; data: StudentAccount }>(`/students/${id}`, input);
  return data.data;
}

export async function deleteStudent(id: string) {
  await api.delete(`/students/${id}`);
}

export async function createStudent(input: StudentProfileInput & { password: string }) {
  const { data } = await api.post<{ success: true; message: string; data: StudentAccount }>('/students', input);
  return data.data;
}
