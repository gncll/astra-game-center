import { redirect } from 'next/navigation';
import { currentAccount } from '@/lib/auth';
import { authConfigured } from '@/lib/config';
import LoginForm from './form';
export const dynamic = 'force-dynamic';
export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await currentAccount()) redirect('/library');
  const { error } = await searchParams;
  return <main className="auth-shell">
    <a className="auth-brand brand" href="/login"><img src="/center/brand.svg" alt="" width="43" height="43" /><span>astra<small>GAME CENTER</small></span></a>
    <section className="auth-card"><div className="auth-copy"><p className="eyebrow">YOUR NEXT ADVENTURE</p><h1>A little escape.<br />A world of play.</h1><p className="auth-description">Your favorite worlds, all in one place. Sign in to explore the collection and make it yours.</p><LoginForm configured={authConfigured} expired={Boolean(error)} /><p className="auth-footnote">Your collection. Your favorites. Your next round.</p></div><div className="auth-art"><div className="auth-glow" /><img src="/center/assets/wardenfall.png" alt="Wardenfall game cover" /><span className="auth-featured">FIRST IN THE COLLECTION</span><h2>Wardenfall</h2><p>Build your defenses. Protect the realm.</p></div></section>
    <footer><span className="footer-brand">✦ &nbsp; ASTRA GAME CENTER</span><span>Your games. Your space.</span><span>EARLY ACCESS</span></footer>
  </main>;
}
