import { useQuery } from '@tanstack/react-query';
import { getSession } from './auth-api';

export const sessionQueryKey = ['auth', 'session'] as const;

export function useAuth() {
  return useQuery({
    queryKey: sessionQueryKey,
    queryFn: ({ signal }) => getSession(signal),
    retry: false,
    staleTime: 60_000,
  });
}
