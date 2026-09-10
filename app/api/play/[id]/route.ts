import { currentAccount } from '@/lib/auth';
import { json, mutationBody, mutationError } from '@/lib/http';
import { playableGame } from '@/lib/security.mjs';
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try { await mutationBody(request); } catch (error) { return mutationError(error); }
  const { id } = await params;
  if (!playableGame(id)) return json({ error: 'This game is not available yet.' }, 404);
  const account = await currentAccount();
  if (!account) return json({ error: 'Please sign in.' }, 401);
  const { error } = await account.client.rpc('record_game_launch', { p_game_id: id });
  if (error) return json({ error: 'Could not open your game. Please try again.' }, 503);
  return json({ url: '/games/wardenfall/index.html' });
}
