import { isAxiosError } from 'axios';
import { z } from 'zod';

import { api } from '@/lib/client';
import { AppError } from '@/lib/errors';
import { readValidated } from '@/lib/read';

import { type Order, type OrderBody, orderSchema } from '../types/order';

export type PostResult =
  | { kind: 'created'; order: Order }
  | { kind: 'rejected'; message: string }
  | { kind: 'uncertain' };

// 4xx means the server refused the order, except 408, where it may still have run it.
const isSafeRejection = (error: unknown): error is AppError =>
  error instanceof AppError && error.code === 'http' && error.status !== undefined && error.status >= 400 && error.status < 500 && error.status !== 408;

/** Sends an order exactly once. It never retries, because the API has no idempotency. */
export async function postOrder(body: OrderBody): Promise<PostResult> {
  try {
    const response = await api.post<unknown>('/orders', body);
    const order = orderSchema.safeParse(response.data);
    return order.success ? { kind: 'created', order: order.data } : { kind: 'uncertain' };
  } catch (error) {
    if (!isSafeRejection(error)) return { kind: 'uncertain' };
    const data: unknown = isAxiosError(error.cause) ? error.cause.response?.data : undefined;
    const apiMessage = z.object({ error: z.string().min(1) }).safeParse(data);
    return { kind: 'rejected', message: apiMessage.success ? apiMessage.data.error : error.message };
  }
}

/** Reads the account's order history. One unreadable order fails the whole read. */
export function getOrders(): Promise<Order[]> {
  return readValidated('/orders', {}, (data) => z.array(orderSchema).parse(data));
}
