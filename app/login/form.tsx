'use client';
import { useState } from 'react';
export default function LoginForm({ configured, expired }: { configured: boolean; expired: boolean }) {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(expired ? 'That sign-in link could not be used. Request a new one below.' : '');
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const response = await fetch('/auth/start', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Astra-Request': '1' }, body: JSON.stringify({ email }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Please try again.');
      setSent(true);
    } catch (error) { setError(error instanceof Error ? error.message : 'Could not send your sign-in link.'); } finally { setBusy(false); }
  }
  if (!configured) return <div className="auth-notice" role="status"><strong>The doors open soon.</strong><p>Sign-in is not available yet. Please check back shortly.</p></div>;
  if (sent) return <div className="auth-notice" role="status"><strong>Check your inbox.</strong><p>Follow the sign-in link sent to {email}. Open it in this browser to continue.</p><button className="soft-button" onClick={() => setSent(false)}>Use another email</button></div>;
  return <form className="auth-form" onSubmit={submit}><label htmlFor="email">Email address</label><input id="email" name="email" type="email" autoComplete="email" placeholder="you@example.com" required maxLength={254} value={email} onChange={event => setEmail(event.target.value)} disabled={busy} /><button className="primary-button" disabled={busy} type="submit">{busy ? 'Sending your link…' : 'Email me a sign-in link'} <span aria-hidden="true">→</span></button><p className="auth-hint">No password to remember. New here? Your first sign-in creates your account.</p>{error && <p className="auth-error" role="alert">{error}</p>}</form>;
}
