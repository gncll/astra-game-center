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
  const value = process.env.SITE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://127.0.0.1:4194');
  const url = new URL(value);
  if (url.protocol !== 'https:' && !(['127.0.0.1','localhost'].includes(url.hostname) && url.protocol === 'http:')) throw new Error('A secure site URL is required.');
  return url.origin;
}
export function allowedOrigins() {
  return [siteOrigin(), ...(process.env.VERCEL_URL ? [`https://${process.env.VERCEL_URL}`] : [])];
}
