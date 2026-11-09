import type { AxiosRequestConfig } from 'axios';

import { api } from './client';
import { normalizeError } from './errors';

/** GETs a path and validates the body, rejecting only with normalized errors. */
export async function readValidated<T>(path: string, config: AxiosRequestConfig, parse: (data: unknown) => T): Promise<T> {
  try {
    const response = await api.get<unknown>(path, config);
    return parse(response.data);
  } catch (error) {
    throw normalizeError(error);
  }
}
