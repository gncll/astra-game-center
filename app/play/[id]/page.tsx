import { notFound, redirect } from 'next/navigation';
import { currentAccount } from '@/lib/auth';
import { playableGame } from '@/lib/security.mjs';
import Launch from './launch';
import catalog from '@/lib/catalog.json';
export default async function Play({ params }: { params: Promise<{ id: string }> }) {
  if (!await currentAccount()) redirect('/login');
  const { id } = await params;
  if (!playableGame(id)) notFound();
  const game = catalog.find(game => game.id === id)!;
  return <main className="launch-page"><section className="launch-panel"><img src={'/center/assets/' + id + '.png'} alt={game.name + ' logo'} /><p className="eyebrow">ASTRA GAME CENTER</p><h1>{game.name}</h1><Launch id={id} name={game.name} /><a className="launch-back" href="/library">← Back to collection</a></section></main>;
}
