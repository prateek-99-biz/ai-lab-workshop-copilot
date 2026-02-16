import { createBrowserClient } from '@supabase/ssr';

let _client: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  if (_client) return _client;

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    'https://tzluujlshkzhixvzgwlj.supabase.co';
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    'sb_publishable__l5v4Pb0uldWK2pSJf97jQ_yS4RNGws';

  _client = createBrowserClient(
    supabaseUrl,
    supabaseKey
  );

  return _client;
}
