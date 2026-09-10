import 'server-only';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { authConfigured, cookieOptions, supabaseKey, supabaseUrl } from './config';

export async function auth() {
  if (!authConfigured) return null;
  const jar = await cookies();
  const client = createServerClient(supabaseUrl, supabaseKey, {
    cookieOptions,
    cookies: {
      getAll: () => jar.getAll(),
      setAll: values => {
        // Server Components cannot write cookies; proxy.ts already refreshes them.
        try { for (const { name, value, options } of values) jar.set(name, value, options); } catch { /* Read-only server component context. */ }
      },
    },
  });
  return client;
}
export async function currentAccount() {
  const client = await auth();
  if (!client) return null;
  const { data, error } = await client.auth.getUser();
  return error || !data.user ? null : { client, user: data.user };
}
