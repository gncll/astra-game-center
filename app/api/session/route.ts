import { currentAccount } from '@/lib/auth';
import { json } from '@/lib/http';
export async function GET() {
  const account = await currentAccount();
  return account ? json({ user: { id: account.user.id } }) : json({ error: 'Please sign in.' }, 401);
}
