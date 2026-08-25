import 'server-only';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

type SupabaseProxyOptions = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
};

export function supabaseApi(
  path: string,
  init?: SupabaseProxyOptions,
): Promise<Response> {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return Promise.reject(
      new Error('Supabase server secrets are not configured.'),
    );
  }

  const headers = new Headers(init?.headers);
  headers.set('apikey', supabaseServiceRoleKey);
  headers.set('Authorization', `Bearer ${supabaseServiceRoleKey}`);
  if (init?.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  return fetch(`${supabaseUrl}${path}`, {
    method: init?.method ?? 'GET',
    headers,
    body:
      init?.body === undefined
        ? undefined
        : typeof init.body === 'string'
          ? init.body
          : JSON.stringify(init.body),
    cache: 'no-store',
  });
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