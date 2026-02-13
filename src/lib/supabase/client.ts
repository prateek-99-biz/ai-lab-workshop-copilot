import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    'https://tzluujlshkzhixvzgwlj.supabase.co';
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    'sb_publishable__l5v4Pb0uldWK2pSJf97jQ_yS4RNGws';

  return createBrowserClient(
    supabaseUrl,
    supabaseKey
  );
}
