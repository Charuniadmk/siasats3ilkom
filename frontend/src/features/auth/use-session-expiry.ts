import { useEffect } from 'react';
import axios from 'axios';
import { useQueryClient } from '@tanstack/react-query';
import { sessionQueryKey } from './use-auth';

export function useSessionExpiry(error: unknown) {
  const queryClient = useQueryClient();
  useEffect(() => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      queryClient.setQueryData(sessionQueryKey, null);
    }
  }, [error, queryClient]);
}
