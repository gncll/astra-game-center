function secureOrigin(value) {
  const url = new URL(value);
  if (url.protocol !== 'https:' && !(['127.0.0.1', 'localhost'].includes(url.hostname) && url.protocol === 'http:')) {
    throw new Error('A secure site URL is required.');
  }
  return url.origin;
}

export function resolveSiteOrigin(env) {
  if (env.SITE_URL) return secureOrigin(env.SITE_URL);
  // VERCEL_URL is unique to a build; the production alias is a different origin.
  // Production URLs exist in previews too, so only prefer them in production.
  if (env.VERCEL_ENV === 'production' && env.VERCEL_PROJECT_PRODUCTION_URL) {
    return secureOrigin(`https://${env.VERCEL_PROJECT_PRODUCTION_URL}`);
  }
  if (env.VERCEL_URL) return secureOrigin(`https://${env.VERCEL_URL}`);
  return 'http://127.0.0.1:4194';
}

export function resolveAllowedOrigins(env) {
  return [...new Set([
    resolveSiteOrigin(env),
    ...(env.VERCEL_URL ? [secureOrigin(`https://${env.VERCEL_URL}`)] : []),
  ])];
}
