import { readValidated } from '@/lib/read';

import type { Portfolio } from '../types/holding';
import { parsePortfolio } from '../utils/parse-portfolio';

export function getPortfolio(signal: AbortSignal): Promise<Portfolio> {
  return readValidated('/portfolio', { signal }, parsePortfolio);
}
