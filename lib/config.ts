import { resolveAllowedOrigins, resolveSiteOrigin } from './origins.mjs';

export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
export const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';
export const authConfigured = Boolean(supabaseUrl && supabaseKey);
export const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  path: '/',
  secure: Boolean(process.env.SITE_URL?.startsWith('https://') || process.env.VERCEL),
};
export function siteOrigin() {
  return resolveSiteOrigin(process.env);
}
export function allowedOrigins() {
  return resolveAllowedOrigins(process.env);
}
