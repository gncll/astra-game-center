import { currentAccount } from '@/lib/auth';
import { json } from '@/lib/http';
import { libraryRows } from '@/lib/security.mjs';
import games from '@/lib/catalog.json';
export async function GET() {
  const account = await currentAccount();
  if (!account) return json({ error: 'Please sign in.' }, 401);
  const { data, error } = await account.client.from('game_library').select('game_id,favorite,last_launched_at').eq('user_id', account.user.id);
  if (error) return json({ error: 'Your library could not be loaded. Please try again shortly.' }, 503);
  return json({ games, ...libraryRows(data || []), player: { name: account.user.email?.split('@')[0] || 'Player' } });
}
