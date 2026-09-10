import { auth } from '@/lib/auth';
import { siteOrigin } from '@/lib/config';
import { json, mutationBody, mutationError } from '@/lib/http';
import { validEmail } from '@/lib/security.mjs';
export async function POST(request: Request) {
  let body;
  try { body = await mutationBody(request); } catch (error) { return mutationError(error); }
  if (!validEmail(body.email)) return json({ error: 'Please enter a valid email address.' }, 400);
  const client = await auth();
  if (!client) return json({ error: 'Sign-in is not available yet. Please check back shortly.' }, 503);
  const { error } = await client.auth.signInWithOtp({ email: body.email.trim(), options: { emailRedirectTo: siteOrigin() + '/auth/callback' } });
  if (error) return json({ error: error.status === 429 ? 'Please wait a little before requesting another link.' : 'Could not send your sign-in link. Please try again shortly.' }, error.status === 429 ? 429 : 502);
  return json({ sent: true });
}
