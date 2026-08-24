import 'server-only';

import { ReplitConnectors } from '@replit/connectors-sdk';

const connectors = new ReplitConnectors();

type SupabaseProxyOptions = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
};

export function supabaseApi(
  path: string,
  init?: SupabaseProxyOptions,
): Promise<Response> {
  return connectors.proxy('supabase', path, init);
}

export async function supabaseJson<T>(
  path: string,
  init?: SupabaseProxyOptions,
): Promise<{ response: Response; data: T | null }> {
  const response = await supabaseApi(path, init);
  let data: T | null = null;
  try {
    data = (await response.json()) as T;
  } catch {
    // Empty 204 responses are valid for some PostgREST operations.
  }
  return { response, data };
}