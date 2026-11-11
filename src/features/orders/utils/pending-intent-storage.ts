import AsyncStorage from '@react-native-async-storage/async-storage';
import { z } from 'zod';

import { env } from '@/config/env';

import type { Intent, IntentStorage } from './order-submitter';

// One key per API and account, so an intent from another account never blocks this one.
const key = `orders:pending-intent:${env.apiUrl}:${env.candidateId}`;

const intentSchema = z.object({
  body: z.object({
    instrument_id: z.number(),
    side: z.enum(['BUY', 'SELL']),
    type: z.enum(['MARKET', 'LIMIT']),
    quantity: z.number(),
    price: z.number().optional(),
  }),
  knownIds: z.array(z.number()),
});

const parseIntent = (raw: string | null): Intent | null => {
  if (raw === null) return null;
  try {
    const intent = intentSchema.safeParse(JSON.parse(raw));
    return intent.success ? intent.data : null;
  } catch {
    return null;
  }
};

/** Keeps the order intent on the device so it survives the app closing mid-request. */
export const pendingIntentStorage: IntentStorage = {
  read: async () => parseIntent(await AsyncStorage.getItem(key)),
  write: (intent) => AsyncStorage.setItem(key, JSON.stringify(intent)),
  clear: () => AsyncStorage.removeItem(key),
};
