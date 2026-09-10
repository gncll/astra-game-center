import { currentAccount } from '@/lib/auth';
import { json, mutationBody, mutationError } from '@/lib/http';
import { gameEntry } from '@/lib/security.mjs';
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try { await mutationBody(request); } catch (error) { return mutationError(error); }
  const { id } = await params;
  const url = gameEntry(id);
  if (!url) return json({ error: 'This game is not available yet.' }, 404);
  const account = await currentAccount();
  if (!account) return json({ error: 'Please sign in.' }, 401);
  // Existing RLS grants cover all catalog IDs. Preserve a favorite if its row already exists.
  const { error: insertError } = await account.client.from('game_library').upsert({ user_id: account.user.id, game_id: id }, { onConflict: 'user_id,game_id', ignoreDuplicates: true });
  if (insertError) return json({ error: 'Could not open your game. Please try again.' }, 503);
  const { error } = await account.client.from('game_library').update({ last_launched_at: new Date().toISOString() }).eq('user_id', account.user.id).eq('game_id', id);
  if (error) return json({ error: 'Could not open your game. Please try again.' }, 503);
  return json({ url });
}
