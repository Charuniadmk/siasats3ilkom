import axios from 'axios';
import { api } from '../../lib/api';
import type { LoginInput, SessionUser } from './types';

interface AuthResponse {
  success: true;
  message: string;
  data: SessionUser;
}

export async function getSession(signal?: AbortSignal): Promise<SessionUser | null> {
  try {
    const { data } = await api.get<AuthResponse>('/auth/me', { signal });
    return data.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401) return null;
    throw error;
  }
}

export async function login(input: LoginInput) {
  const { data } = await api.post<AuthResponse>('/auth/login', input);
  return data.data;
}

export async function logout() {
  try {
    await api.post('/auth/logout', {});
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401) return;
    throw error;
  }
}

export function authErrorMessage(error: unknown) {
  if (axios.isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message ?? 'Tidak dapat terhubung ke server. Silakan coba kembali.';
  }
  return 'Terjadi kesalahan. Silakan coba kembali.';
}
