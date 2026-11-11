import { useSyncExternalStore } from 'react';

import { getOrders, postOrder } from '../api/orders-api';
import { createOrderSubmitter } from '../utils/order-submitter';
import { pendingIntentStorage } from '../utils/pending-intent-storage';

// One instance for the whole app, so every modal shares the same lock.
const submitter = createOrderSubmitter({ postOrder, getOrders, storage: pendingIntentStorage });

export function useOrderSubmission() {
  const state = useSyncExternalStore(submitter.subscribe, submitter.getState);
  return { state, submit: submitter.submit, resume: submitter.resume, dismiss: submitter.dismiss };
}
