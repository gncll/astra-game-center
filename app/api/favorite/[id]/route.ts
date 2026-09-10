import { currentAccount } from '@/lib/auth';
import { json, mutationBody, mutationError } from '@/lib/http';
import { validGameId } from '@/lib/security.mjs';
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  let body; try { body = await mutationBody(request); } catch (error) { return mutationError(error); }
  const { id } = await params;
  if (!validGameId(id) || typeof body.favorite !== 'boolean') return json({ error: 'Invalid game or favorite selection.' }, 400);
  const account = await currentAccount();
  if (!account) return json({ error: 'Please sign in.' }, 401);
  const result = await account.client.rpc('set_game_favorite', { p_game_id: id, p_favorite: body.favorite });
  if (result.error) return json({ error: 'Your favorite could not be saved. Please try again.' }, 503);
  const { data, error } = await account.client.from('game_library').select('game_id').eq('user_id', account.user.id).eq('favorite', true);
  return error ? json({ error: 'Please refresh your library.' }, 503) : json({ favorites: (data || []).map(row => row.game_id) });
}
