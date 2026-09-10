import { auth } from '@/lib/auth';
import { json, mutationBody, mutationError } from '@/lib/http';
export async function POST(request: Request) {
  try { await mutationBody(request); } catch (error) { return mutationError(error); }
  const client = await auth();
  if (client) { const { error } = await client.auth.signOut({ scope: 'local' }); if (error) return json({ error: 'Could not sign out. Please try again.' }, 502); }
  return json({ signedOut: true });
}
