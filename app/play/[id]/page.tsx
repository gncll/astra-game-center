import { notFound, redirect } from 'next/navigation';
import { currentAccount } from '@/lib/auth';
import { playableGame } from '@/lib/security.mjs';
import Launch from './launch';
export default async function Play({ params }: { params: Promise<{ id: string }> }) {
  if (!await currentAccount()) redirect('/login');
  const { id } = await params;
  if (!playableGame(id)) notFound();
  return <main className="launch-page"><section className="launch-panel"><img src="/center/assets/wardenfall.png" alt="Wardenfall" /><p className="eyebrow">ASTRA GAME CENTER</p><h1>Your next adventure is loading.</h1><Launch id={id} /><a className="launch-back" href="/library">← Back to collection</a></section></main>;
}
