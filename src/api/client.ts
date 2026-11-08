import { create } from 'axios';

import { env } from '@/config/env';

import { normalizeError } from './errors';

export const api = create({
  baseURL: env.apiUrl,
  timeout: 10_000,
  headers: {
    'X-Candidate-Id': env.candidateId,
    'X-Enable-Bugs': env.bugs,
  },
});

api.interceptors.response.use(
  (response) => response,
  (error: unknown) => Promise.reject(normalizeError(error)),
);
