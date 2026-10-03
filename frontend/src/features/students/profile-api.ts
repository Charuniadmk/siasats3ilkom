import { api } from '../../lib/api';
import type { StudentAccount, StudentProfileInput } from './students-api';

export async function getMyProfile(signal?: AbortSignal) {
  const { data } = await api.get<{ success: true; data: StudentAccount }>('/profile', { signal });
  return data.data;
}

export async function updateMyProfile(input: Omit<StudentProfileInput, 'nim'>) {
  const { data } = await api.patch<{ success: true; message: string; data: StudentAccount }>('/profile', input);
  return data.data;
}

export async function changeMyPassword(input: { currentPassword: string; newPassword: string; confirmPassword: string }) {
  await api.patch('/profile/password', input);
}
