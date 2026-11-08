import { create } from 'axios';

import { env } from '@/config/env';

export const api = create({
  baseURL: env.apiUrl,
  timeout: 10_000,
  headers: {
    'X-Candidate-Id': env.candidateId,
    'X-Enable-Bugs': env.bugs,
  },
});
