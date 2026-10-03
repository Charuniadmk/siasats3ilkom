import { api } from '../../lib/api';

export interface StudentAccount {
  id: string;
  nim: string;
  createdAt: string;
}

export interface StudentList {
  success: true;
  data: StudentAccount[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export const studentsQueryKey = ['students'] as const;

export async function listStudents(page: number, search: string, signal?: AbortSignal) {
  const { data } = await api.get<StudentList>('/students', { params: { page, search, limit: 20 }, signal });
  return data;
}

export async function createStudent(input: { nim: string; password: string }) {
  const { data } = await api.post<{ success: true; message: string; data: StudentAccount }>('/students', input);
  return data.data;
}
