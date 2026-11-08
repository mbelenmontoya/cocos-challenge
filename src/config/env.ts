import { z } from 'zod';

export const env = z.object({
  apiUrl: z.url({ protocol: /^https?$/ }),
  candidateId: z.string().trim().min(1),
  bugs: z.enum(['off', 'easy', 'medium', 'hard']),
}).parse({
  apiUrl: process.env.EXPO_PUBLIC_API_URL,
  candidateId: process.env.EXPO_PUBLIC_CANDIDATE_ID,
  bugs: process.env.EXPO_PUBLIC_ENABLE_BUGS,
});
