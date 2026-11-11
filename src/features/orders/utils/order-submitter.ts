import type { PostResult } from '../api/orders-api';
import type { Order, OrderBody } from '../types/order';

export type Intent = { body: OrderBody; knownIds: number[] };

export type IntentStorage = {
  read: () => Promise<Intent | null>;
  write: (intent: Intent) => Promise<void>;
  clear: () => Promise<void>;
};

export type SubmissionState =
  | { kind: 'idle' }
  | { kind: 'sending' }
  | { kind: 'checking' }
  | { kind: 'created'; order: Order; confirmedByHistory: boolean }
  | { kind: 'rejected'; message: string }
  | { kind: 'not_sent' }
  | { kind: 'uncertain' }
  | { kind: 'not_created' };

type Dependencies = {
  postOrder: (body: OrderBody) => Promise<PostResult>;
  getOrders: () => Promise<Order[]>;
  storage: IntentStorage;
};

// A MARKET order comes back with its execution price, so price only identifies a LIMIT order.
const matches = (order: Order, body: OrderBody) =>
  order.instrument_id === body.instrument_id
  && order.side === body.side
  && order.type === body.type
  && order.quantity === body.quantity
  && (body.type === 'MARKET' || order.price === body.price);

/**
 * Sends at most one order at a time, without retries, and reconciles an uncertain
 * result against the order history. The API has no idempotency key.
 */
export function createOrderSubmitter({ postOrder, getOrders, storage }: Dependencies) {
  let state: SubmissionState = { kind: 'idle' };
  let busy = false;
  const listeners = new Set<() => void>();

  const set = (next: SubmissionState) => {
    state = next;
    listeners.forEach((listener) => listener());
  };

  // The check and the flag run before any await, so a second tap in the same instant is ignored.
  const exclusive = async (task: () => Promise<void>) => {
    if (busy) return;
    busy = true;
    try {
      await task();
    } finally {
      busy = false;
    }
  };

  // A failed clear leaves the intent stored, so the next submit reconciles it again
  // and finds the same order. The result is still shown now.
  const clearIntent = () => storage.clear().catch(() => undefined);

  const reconcile = async (intent: Intent) => {
    set({ kind: 'checking' });
    let history: Order[];
    try {
      history = await getOrders();
    } catch {
      set({ kind: 'uncertain' });
      return;
    }
    const known = new Set(intent.knownIds);
    const order = history.find((candidate) => !known.has(candidate.id) && matches(candidate, intent.body));
    await clearIntent();
    set(order ? { kind: 'created', order, confirmedByHistory: true } : { kind: 'not_created' });
  };

  const submit = (body: OrderBody) => exclusive(async () => {
    let pending: Intent | null;
    let knownIds: number[];
    try {
      pending = await storage.read();
      if (pending) {
        await reconcile(pending);
        return;
      }
      set({ kind: 'sending' });
      knownIds = (await getOrders()).map((order) => order.id);
      await storage.write({ body, knownIds });
    } catch {
      set({ kind: 'not_sent' });
      return;
    }

    const result = await postOrder(body);
    if (result.kind === 'uncertain') {
      await reconcile({ body, knownIds });
      return;
    }
    await clearIntent();
    set(result.kind === 'created' ? { kind: 'created', order: result.order, confirmedByHistory: false } : result);
  });

  // If the device cannot be read here, submit tries again and reports not_sent.
  const resume = () => exclusive(async () => {
    const pending = await storage.read().catch(() => null);
    if (pending) await reconcile(pending);
  });

  return {
    getState: () => state,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    submit,
    resume,
    dismiss: () => { if (!busy) set({ kind: 'idle' }); },
  };
}

export type OrderSubmitter = ReturnType<typeof createOrderSubmitter>;
