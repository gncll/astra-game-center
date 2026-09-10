import { auth } from '@/lib/auth';
import { siteOrigin } from '@/lib/config';
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const code = params.get('code');
  const tokenHash = params.get('token_hash');
  const client = await auth();
  if (client && (code || (tokenHash && params.get('type') === 'email'))) {
    const { error } = code
      ? await client.auth.exchangeCodeForSession(code)
      : await client.auth.verifyOtp({ token_hash: tokenHash!, type: 'email' });
    if (!error) return Response.redirect(siteOrigin() + '/library');
  }
  return Response.redirect(siteOrigin() + '/login?error=expired');
}
